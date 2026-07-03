const vm = require('vm');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { SUPPORTED_LANGUAGES } = require('./contest.constants');

const DEFAULT_TIMEOUT_MS = 5000;
const PISTON_URL =
  process.env.PISTON_API_URL || 'https://emkc.org/api/v2/piston';

const STATUS = {
  ACCEPTED: 'Accepted',
  WRONG_ANSWER: 'Wrong Answer',
  TIME_LIMIT: 'Time Limit Exceeded',
  RUNTIME_ERROR: 'Runtime Error',
  COMPILE_ERROR: 'Compile Error',
};

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((key) => deepEqual(a[key], b[key]));
  }
  return false;
}

function normalizeOutput(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeOutput(item));
  }
  if (value && typeof value === 'object') {
    const sorted = {};
    Object.keys(value)
      .sort()
      .forEach((key) => {
        sorted[key] = normalizeOutput(value[key]);
      });
    return sorted;
  }
  return value;
}

function buildJavaScriptHarness(userCode, functionName, input, problem) {
  if (problem?.inPlace && problem.inPlaceKey) {
    const key = problem.inPlaceKey;
    return `
${userCode}
const __input = ${JSON.stringify(input)};
const __target = Array.isArray(__input.${key})
  ? [...__input.${key}]
  : __input.${key};
const __args = Object.keys(__input).map((k) =>
  k === "${key}" ? __target : __input[k]
);
${functionName}(...__args);
console.log(JSON.stringify(__target));
`;
  }

  return `
${userCode}
const __input = ${JSON.stringify(input)};
const __args = Object.keys(__input).map((key) => __input[key]);
const __result = ${functionName}(...__args);
if (typeof __result !== 'undefined') {
  console.log(JSON.stringify(__result));
}
`;
}

function buildPythonHarness(userCode, functionName, input, problem) {
  if (problem?.inPlace && problem.inPlaceKey) {
    const key = problem.inPlaceKey;
    return `
import json
${userCode}
__input = json.loads(${JSON.stringify(JSON.stringify(input))})
__target = list(__input["${key}"])
__args = [__target if k == "${key}" else __input[k] for k in __input]
${functionName}(*__args)
print(json.dumps(__target))
`;
  }

  return `
import json
${userCode}
__input = json.loads(${JSON.stringify(JSON.stringify(input))})
__result = ${functionName}(**__input)
print(json.dumps(__result))
`;
}

function buildJavaHarness(userCode, functionName, input) {
  const args = Object.values(input);
  const argTypes = args.map((val) => {
    if (Array.isArray(val)) {
      if (val.every((item) => typeof item === 'number')) return 'int[]';
      if (val.every((item) => typeof item === 'string')) return 'String[]';
      return 'Object[]';
    }
    if (typeof val === 'number') return Number.isInteger(val) ? 'int' : 'double';
    if (typeof val === 'boolean') return 'boolean';
    if (typeof val === 'string') return 'String';
    return 'Object';
  });

  const argList = argTypes
    .map((type, index) => {
      const val = args[index];
      if (type === 'int[]') {
        return `new int[]{${val.join(',')}}`;
      }
      if (type === 'String[]') {
        return `new String[]{${val.map((s) => `"${s}"`).join(',')}}`;
      }
      if (type === 'int') return String(val);
      if (type === 'boolean') return val ? 'true' : 'false';
      if (type === 'String') return `"${val}"`;
      return 'null';
    })
    .join(', ');

  return `
import java.util.*;
import com.google.gson.Gson;
${userCode.replace('class Solution', 'class Main')}
public class Runner {
  public static void main(String[] args) {
    Solution solution = new Solution();
    Object result = solution.${functionName}(${argList});
    System.out.println(new Gson().toJson(result));
  }
}
`;
}

function runJavaScriptLocal(code, timeoutMs = DEFAULT_TIMEOUT_MS) {
  return new Promise((resolve) => {
    const logs = [];
    const sandbox = {
      console: {
        log: (...args) => logs.push(args.map(String).join(' ')),
      },
      JSON,
      Math,
      Array,
      Object,
      Map,
      Set,
      parseInt,
      parseFloat,
      Number,
      String,
      Boolean,
      Infinity,
      NaN,
    };

    try {
      const script = new vm.Script(code);
      script.runInNewContext(sandbox, { timeout: timeoutMs });
      resolve({
        stdout: logs.join('\n').trim(),
        stderr: '',
        exitCode: 0,
      });
    } catch (error) {
      resolve({
        stdout: logs.join('\n').trim(),
        stderr: error.message,
        exitCode: 1,
      });
    }
  });
}

function runPythonLocal(code, timeoutMs = DEFAULT_TIMEOUT_MS) {
  return new Promise((resolve) => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'acadify-judge-'));
    const filePath = path.join(tempDir, 'solution.py');
    fs.writeFileSync(filePath, code, 'utf8');

    const child = spawn('python', [filePath], { windowsHide: true });
    let stdout = '';
    let stderr = '';
    let killed = false;

    const timer = setTimeout(() => {
      killed = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        /* ignore cleanup errors */
      }
      resolve({
        stdout: stdout.trim(),
        stderr: killed ? 'Time Limit Exceeded' : stderr.trim(),
        exitCode: killed ? 124 : code ?? 1,
      });
    });

    child.on('error', () => {
      clearTimeout(timer);
      resolve({
        stdout: '',
        stderr: 'Python is not installed on the server',
        exitCode: 127,
      });
    });
  });
}

async function runPiston(language, version, code, timeoutMs = DEFAULT_TIMEOUT_MS) {
  try {
    const response = await fetch(`${PISTON_URL}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language,
        version,
        files: [{ name: `main.${language}`, content: code }],
        run_timeout: timeoutMs,
        compile_timeout: timeoutMs,
      }),
    });

    if (!response.ok) {
      return {
        stdout: '',
        stderr: `Judge service unavailable (${response.status})`,
        exitCode: 1,
        compile: null,
      };
    }

    const data = await response.json();
    return {
      stdout: (data.run?.stdout || '').trim(),
      stderr: (data.run?.stderr || data.compile?.stderr || '').trim(),
      exitCode: data.run?.code ?? 1,
      compile: data.compile || null,
    };
  } catch (error) {
    return {
      stdout: '',
      stderr: error.message || 'Judge service error',
      exitCode: 1,
      compile: null,
    };
  }
}

async function executeCode({ language, code, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  if (language === 'javascript') {
    return runJavaScriptLocal(code, timeoutMs);
  }

  if (language === 'python') {
    const local = await runPythonLocal(code, timeoutMs);
    if (local.exitCode !== 127) return local;

    const lang = SUPPORTED_LANGUAGES.find((item) => item.id === 'python');
    return runPiston(lang.pistonLanguage, lang.pistonVersion, code, timeoutMs);
  }

  const lang = SUPPORTED_LANGUAGES.find((item) => item.id === language);
  if (!lang) {
    return { stdout: '', stderr: 'Unsupported language', exitCode: 1 };
  }

  return runPiston(lang.pistonLanguage, lang.pistonVersion, code, timeoutMs);
}

function parseOutput(stdout) {
  if (!stdout) return undefined;
  try {
    return JSON.parse(stdout);
  } catch {
    const trimmed = stdout.trim();
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    const num = Number(trimmed);
    if (!Number.isNaN(num) && String(num) === trimmed) return num;
    return trimmed;
  }
}

function buildHarnessCode({ language, userCode, functionName, input, problem }) {
  if (language === 'javascript') {
    return buildJavaScriptHarness(userCode, functionName, input, problem);
  }
  if (language === 'python') {
    return buildPythonHarness(userCode, functionName, input, problem);
  }
  if (language === 'java') {
    return buildJavaHarness(userCode, functionName, input);
  }
  if (language === 'cpp') {
    const args = Object.values(input);
    const argList = args
      .map((val) => {
        if (Array.isArray(val)) {
          if (val.every((item) => typeof item === 'number')) {
            return `{${val.join(',')}}`;
          }
        }
        if (typeof val === 'number') return String(val);
        if (typeof val === 'string') return `"${val}"`;
        return '""';
      })
      .join(', ');

    return `
#include <bits/stdc++.h>
#include <nlohmann/json.hpp>
using json = nlohmann::json;
using namespace std;
${userCode.replace('class Solution', 'class Solution')}
int main() {
  Solution solution;
  auto result = solution.${functionName}(${argList});
  cout << json(result).dump() << endl;
  return 0;
}
`;
  }

  return userCode;
}

async function runSingleTest({
  language,
  userCode,
  functionName,
  testCase,
  problem,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  const harness = buildHarnessCode({
    language,
    userCode,
    functionName,
    input: testCase.input,
    problem,
  });

  const started = Date.now();
  const result = await executeCode({ language, code: harness, timeoutMs });
  const runtimeMs = Date.now() - started;

  if (result.compile?.stderr) {
    return {
      passed: false,
      status: STATUS.COMPILE_ERROR,
      runtimeMs,
      stdout: result.stdout,
      stderr: result.compile.stderr,
      expected: testCase.output,
      actual: null,
    };
  }

  if (result.exitCode === 124) {
    return {
      passed: false,
      status: STATUS.TIME_LIMIT,
      runtimeMs,
      stdout: result.stdout,
      stderr: result.stderr,
      expected: testCase.output,
      actual: null,
    };
  }

  if (result.exitCode !== 0) {
    return {
      passed: false,
      status: STATUS.RUNTIME_ERROR,
      runtimeMs,
      stdout: result.stdout,
      stderr: result.stderr || 'Runtime error',
      expected: testCase.output,
      actual: null,
    };
  }

  let actual = parseOutput(result.stdout);

  const passed = deepEqual(
    normalizeOutput(actual),
    normalizeOutput(testCase.output)
  );

  return {
    passed,
    status: passed ? STATUS.ACCEPTED : STATUS.WRONG_ANSWER,
    runtimeMs,
    stdout: result.stdout,
    stderr: result.stderr,
    expected: testCase.output,
    actual,
  };
}

async function judgeSubmission({
  language,
  userCode,
  functionName,
  testCases,
  problem,
  sampleOnly = false,
}) {
  const cases = sampleOnly
    ? testCases.filter((tc) => tc.sample)
    : testCases;

  const results = [];
  let maxRuntime = 0;
  let finalStatus = STATUS.ACCEPTED;
  let passedCount = 0;

  for (let i = 0; i < cases.length; i += 1) {
    const testResult = await runSingleTest({
      language,
      userCode,
      functionName,
      testCase: cases[i],
      problem,
    });

    results.push({
      index: i + 1,
      sample: !!cases[i].sample,
      ...testResult,
      input: cases[i].sample ? cases[i].input : undefined,
    });

    maxRuntime = Math.max(maxRuntime, testResult.runtimeMs);

    if (testResult.passed) {
      passedCount += 1;
    } else {
      finalStatus = testResult.status;
      if (!sampleOnly) break;
    }
  }

  const allPassed = passedCount === cases.length;

  return {
    status: allPassed ? STATUS.ACCEPTED : finalStatus,
    passedCount,
    totalCount: cases.length,
    runtimeMs: maxRuntime,
    results,
  };
}

module.exports = {
  STATUS,
  judgeSubmission,
  deepEqual,
};
