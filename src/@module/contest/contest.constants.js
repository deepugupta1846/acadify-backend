const SUPPORTED_LANGUAGES = [
  {
    id: 'javascript',
    label: 'JavaScript',
    monacoId: 'javascript',
    extension: 'js',
    pistonLanguage: 'javascript',
    pistonVersion: '18.15.0',
  },
  {
    id: 'python',
    label: 'Python',
    monacoId: 'python',
    extension: 'py',
    pistonLanguage: 'python',
    pistonVersion: '3.10.0',
  },
  {
    id: 'java',
    label: 'Java',
    monacoId: 'java',
    extension: 'java',
    pistonLanguage: 'java',
    pistonVersion: '15.0.2',
  },
  {
    id: 'cpp',
    label: 'C++',
    monacoId: 'cpp',
    extension: 'cpp',
    pistonLanguage: 'c++',
    pistonVersion: '10.2.0',
  },
];

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

const PROBLEMS = [
  {
    slug: 'two-sum',
    title: 'Two Sum',
    difficulty: 'Easy',
    points: 100,
    tags: ['Array', 'Hash Table'],
    description: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.`,
    examples: [
      {
        input: 'nums = [2,7,11,15], target = 9',
        output: '[0,1]',
        explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].',
      },
      {
        input: 'nums = [3,2,4], target = 6',
        output: '[1,2]',
      },
    ],
    constraints: [
      '2 <= nums.length <= 10^4',
      '-10^9 <= nums[i] <= 10^9',
      '-10^9 <= target <= 10^9',
      'Only one valid answer exists.',
    ],
    starterCode: {
      javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
function twoSum(nums, target) {
  // Write your code here
}`,
      python: `def two_sum(nums, target):
    # Write your code here
    pass`,
      java: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Write your code here
        return new int[0];
    }
}`,
      cpp: `class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        // Write your code here
        return {};
    }
};`,
    },
    functionName: {
      javascript: 'twoSum',
      python: 'two_sum',
      java: 'twoSum',
      cpp: 'twoSum',
    },
    testCases: [
      { input: { nums: [2, 7, 11, 15], target: 9 }, output: [0, 1], sample: true },
      { input: { nums: [3, 2, 4], target: 6 }, output: [1, 2], sample: true },
      { input: { nums: [3, 3], target: 6 }, output: [0, 1], sample: false },
      { input: { nums: [1, 5, 3, 7, 9], target: 10 }, output: [1, 3], sample: false },
    ],
  },
  {
    slug: 'reverse-string',
    title: 'Reverse String',
    difficulty: 'Easy',
    points: 100,
    tags: ['String', 'Two Pointers'],
    description: `Write a function that reverses a string. The input string is given as an array of characters \`s\`.

You must do this by modifying the input array in-place with O(1) extra memory.`,
    examples: [
      {
        input: 's = ["h","e","l","l","o"]',
        output: '["o","l","l","e","h"]',
      },
      {
        input: 's = ["H","a","n","n","a","h"]',
        output: '["h","a","n","n","a","H"]',
      },
    ],
    constraints: ['1 <= s.length <= 10^5', 's[i] is a printable ascii character.'],
    starterCode: {
      javascript: `/**
 * @param {character[]} s
 * @return {void} Do not return anything, modify s in-place instead.
 */
function reverseString(s) {
  // Write your code here
}`,
      python: `def reverse_string(s):
    # Write your code here (modify list in place)
    pass`,
      java: `class Solution {
    public void reverseString(char[] s) {
        // Write your code here
    }
}`,
      cpp: `class Solution {
public:
    void reverseString(vector<char>& s) {
        // Write your code here
    }
};`,
    },
    functionName: {
      javascript: 'reverseString',
      python: 'reverse_string',
      java: 'reverseString',
      cpp: 'reverseString',
    },
    testCases: [
      { input: { s: ['h', 'e', 'l', 'l', 'o'] }, output: ['o', 'l', 'l', 'e', 'h'], sample: true },
      { input: { s: ['H', 'a', 'n', 'n', 'a', 'h'] }, output: ['h', 'a', 'n', 'n', 'a', 'H'], sample: true },
      { input: { s: ['a'] }, output: ['a'], sample: false },
      { input: { s: ['a', 'b'] }, output: ['b', 'a'], sample: false },
    ],
    inPlace: true,
    inPlaceKey: 's',
  },
  {
    slug: 'valid-parentheses',
    title: 'Valid Parentheses',
    difficulty: 'Easy',
    points: 100,
    tags: ['String', 'Stack'],
    description: `Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.`,
    examples: [
      { input: 's = "()"', output: 'true' },
      { input: 's = "()[]{}"', output: 'true' },
      { input: 's = "(]"', output: 'false' },
    ],
    constraints: ['1 <= s.length <= 10^4', 's consists of parentheses only.'],
    starterCode: {
      javascript: `/**
 * @param {string} s
 * @return {boolean}
 */
function isValid(s) {
  // Write your code here
}`,
      python: `def is_valid(s):
    # Write your code here
    pass`,
      java: `class Solution {
    public boolean isValid(String s) {
        // Write your code here
        return false;
    }
}`,
      cpp: `class Solution {
public:
    bool isValid(string s) {
        // Write your code here
        return false;
    }
};`,
    },
    functionName: {
      javascript: 'isValid',
      python: 'is_valid',
      java: 'isValid',
      cpp: 'isValid',
    },
    testCases: [
      { input: { s: '()' }, output: true, sample: true },
      { input: { s: '()[]{}' }, output: true, sample: true },
      { input: { s: '(]' }, output: false, sample: true },
      { input: { s: '([)]' }, output: false, sample: false },
      { input: { s: '{[]}' }, output: true, sample: false },
    ],
  },
  {
    slug: 'maximum-subarray',
    title: 'Maximum Subarray',
    difficulty: 'Medium',
    points: 200,
    tags: ['Array', 'Dynamic Programming'],
    description: `Given an integer array \`nums\`, find the subarray with the largest sum, and return its sum.`,
    examples: [
      {
        input: 'nums = [-2,1,-3,4,-1,2,1,-5,4]',
        output: '6',
        explanation: 'The subarray [4,-1,2,1] has the largest sum 6.',
      },
      { input: 'nums = [1]', output: '1' },
      { input: 'nums = [5,4,-1,7,8]', output: '23' },
    ],
    constraints: ['1 <= nums.length <= 10^5', '-10^4 <= nums[i] <= 10^4'],
    starterCode: {
      javascript: `/**
 * @param {number[]} nums
 * @return {number}
 */
function maxSubArray(nums) {
  // Write your code here
}`,
      python: `def max_sub_array(nums):
    # Write your code here
    pass`,
      java: `class Solution {
    public int maxSubArray(int[] nums) {
        // Write your code here
        return 0;
    }
}`,
      cpp: `class Solution {
public:
    int maxSubArray(vector<int>& nums) {
        // Write your code here
        return 0;
    }
};`,
    },
    functionName: {
      javascript: 'maxSubArray',
      python: 'max_sub_array',
      java: 'maxSubArray',
      cpp: 'maxSubArray',
    },
    testCases: [
      { input: { nums: [-2, 1, -3, 4, -1, 2, 1, -5, 4] }, output: 6, sample: true },
      { input: { nums: [1] }, output: 1, sample: true },
      { input: { nums: [5, 4, -1, 7, 8] }, output: 23, sample: true },
      { input: { nums: [-1] }, output: -1, sample: false },
    ],
  },
  {
    slug: 'fizz-buzz',
    title: 'Fizz Buzz',
    difficulty: 'Easy',
    points: 100,
    tags: ['Math', 'String'],
    description: `Given an integer \`n\`, return a string array \`answer\` where:

- \`answer[i] == "FizzBuzz"\` if \`i\` is divisible by 3 and 5.
- \`answer[i] == "Fizz"\` if \`i\` is divisible by 3.
- \`answer[i] == "Buzz"\` if \`i\` is divisible by 5.
- \`answer[i] == i\` (as a string) otherwise.`,
    examples: [
      { input: 'n = 3', output: '["1","2","Fizz"]' },
      { input: 'n = 5', output: '["1","2","Fizz","4","Buzz"]' },
    ],
    constraints: ['1 <= n <= 10^4'],
    starterCode: {
      javascript: `/**
 * @param {number} n
 * @return {string[]}
 */
function fizzBuzz(n) {
  // Write your code here
}`,
      python: `def fizz_buzz(n):
    # Write your code here
    pass`,
      java: `class Solution {
    public List<String> fizzBuzz(int n) {
        // Write your code here
        return new ArrayList<>();
    }
}`,
      cpp: `class Solution {
public:
    vector<string> fizzBuzz(int n) {
        // Write your code here
        return {};
    }
};`,
    },
    functionName: {
      javascript: 'fizzBuzz',
      python: 'fizz_buzz',
      java: 'fizzBuzz',
      cpp: 'fizzBuzz',
    },
    testCases: [
      { input: { n: 3 }, output: ['1', '2', 'Fizz'], sample: true },
      { input: { n: 5 }, output: ['1', '2', 'Fizz', '4', 'Buzz'], sample: true },
      { input: { n: 15 }, output: ['1', '2', 'Fizz', '4', 'Buzz', 'Fizz', '7', '8', 'Fizz', 'Buzz', '11', 'Fizz', '13', '14', 'FizzBuzz'], sample: false },
    ],
  },
];

function buildDefaultContests() {
  const now = Date.now();
  const hour = 60 * 60 * 1000;

  return [
    {
      id: 'weekly-contest-live',
      title: 'Acadify Weekly Contest #12',
      description:
        'Solve algorithmic challenges against the clock. Top performers earn bragging rights!',
      type: 'weekly',
      durationMinutes: 90,
      startAt: new Date(now - 30 * 60 * 1000).toISOString(),
      endAt: new Date(now + 60 * 60 * 1000).toISOString(),
      problemSlugs: ['two-sum', 'valid-parentheses', 'maximum-subarray'],
      status: 'live',
    },
    {
      id: 'weekly-contest-upcoming',
      title: 'Acadify Weekly Contest #13',
      description: 'Upcoming weekly contest — warm up with practice problems first.',
      type: 'weekly',
      durationMinutes: 90,
      startAt: new Date(now + 2 * 24 * hour).toISOString(),
      endAt: new Date(now + 2 * 24 * hour + 90 * 60 * 1000).toISOString(),
      problemSlugs: ['reverse-string', 'fizz-buzz', 'maximum-subarray'],
      status: 'upcoming',
    },
    {
      id: 'biweekly-practice',
      title: 'Biweekly Practice Challenge',
      description: 'Relaxed timed practice — great for interview prep.',
      type: 'biweekly',
      durationMinutes: 120,
      startAt: new Date(now + 5 * 24 * hour).toISOString(),
      endAt: new Date(now + 5 * 24 * hour + 120 * 60 * 1000).toISOString(),
      problemSlugs: ['two-sum', 'reverse-string', 'valid-parentheses', 'fizz-buzz'],
      status: 'upcoming',
    },
  ];
}

module.exports = {
  SUPPORTED_LANGUAGES,
  DIFFICULTIES,
  PROBLEMS,
  buildDefaultContests,
};
