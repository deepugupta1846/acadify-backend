const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const INTERVIEW_ROLES = [
  'Web Developer',
  'Frontend Developer',
  'Backend Developer',
  'Software Engineer',
  'Data Analyst',
  'Product Manager',
  'UI/UX Designer',
  'DevOps Engineer',
  'Business Analyst',
  'Soft Skills',
  'Digital Marketing',
];

const DIFFICULTY_LEVELS = ['Easy', 'Medium', 'Hard'];

function buildSystemPrompt(role, difficulty) {
  return `You are a professional interviewer conducting a mock interview for a ${role} position at ${difficulty} difficulty.

Interview flow (IMPORTANT — follow this order):
1. Your FIRST message must ONLY include a warm greeting and ask the candidate to introduce themselves (e.g. background, education, experience, interest in this role). Do not ask any technical or behavioral questions in the first message.
2. AFTER the candidate introduces themselves, briefly acknowledge their introduction (1 sentence), then ask your first role-relevant question.
3. Continue with behavioral and ${role}-specific questions appropriate for ${difficulty} level, one question at a time.

Rules:
- Ask one clear question at a time.
- After each answer, briefly acknowledge (1 sentence) then ask the next question.
- Keep each response under 120 words.
- Be professional, encouraging, and constructive.
- Do not provide full answers to technical questions — guide with follow-ups instead.`;
}

function buildFeedbackPrompt(role, difficulty, messages) {
  const transcript = messages
    .filter((m) => m.role !== 'system')
    .map((m) => `${m.role === 'assistant' ? 'Interviewer' : 'Candidate'}: ${m.content}`)
    .join('\n\n');

  return `You are an expert career coach. Review this mock interview transcript for a ${role} role (${difficulty} difficulty) and provide structured feedback.

Transcript:
${transcript}

Respond in JSON only with this exact shape:
{
  "score": <number 1-10>,
  "summary": "<2-3 sentence overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<area 1>", "<area 2>"],
  "tips": ["<actionable tip 1>", "<actionable tip 2>"]
}`;
}

async function callOpenAI(messages, { json = false } = {}) {
  if (!OPENAI_API_KEY) {
    const error = new Error('AI interview service is not configured. Please add OPENAI_API_KEY.');
    error.status = 503;
    throw error;
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 600,
      ...(json ? { response_format: { type: 'json_object' } } : {}),
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.error?.message || 'AI service request failed');
    error.status = response.status === 429 ? 429 : 502;
    throw error;
  }

  return data.choices[0].message.content.trim();
}

function getFallbackGreeting(role, difficulty) {
  return `Hello! Welcome to your ${role} mock interview. I'll be your AI interviewer today at ${difficulty} difficulty. Let's start — please introduce yourself. Tell me about your background, experience, and why you're interested in this role.`;
}

function getFallbackReply(userTurns, role) {
  const followUps = [
    `Thank you for introducing yourself. What relevant experience or projects do you have for this ${role} role?`,
    "That's helpful context. Can you describe a challenging problem you faced and how you solved it?",
    "Good point. How do you handle tight deadlines or conflicting priorities?",
    "Interesting. Tell me about a time you had to learn something new quickly to succeed.",
    "Thanks for your thoughtful answers. Where do you see yourself professionally in the next two to three years?",
    "Do you have any questions for me about the role or team?",
  ];

  const index = Math.min(Math.max(userTurns - 1, 0), followUps.length - 1);
  return followUps[index];
}

function getFallbackFeedback(role) {
  return {
    score: 7,
    summary: `You showed solid communication during this ${role} mock interview. Keep practicing to sharpen your technical depth and structure.`,
    strengths: [
      'Clear and polite communication',
      'Willingness to engage with follow-up questions',
    ],
    improvements: [
      'Use the STAR method for behavioral answers',
      'Add more measurable outcomes to your examples',
    ],
    tips: [
      'Prepare 3–4 project stories with specific metrics',
      'Research the company and role before your real interview',
    ],
  };
}

async function startInterview({ role, difficulty }) {
  const selectedRole = INTERVIEW_ROLES.includes(role) ? role : INTERVIEW_ROLES[0];
  const selectedDifficulty = DIFFICULTY_LEVELS.includes(difficulty)
    ? difficulty
    : 'Medium';

  const systemPrompt = buildSystemPrompt(selectedRole, selectedDifficulty);
  const messages = [{ role: 'system', content: systemPrompt }];

  let greeting;

  if (OPENAI_API_KEY) {
    const reply = await callOpenAI([
      ...messages,
      {
        role: 'user',
        content:
          'Start the interview now. Greet the candidate warmly and ONLY ask them to introduce themselves. Do not ask any other interview questions in this first message.',
      },
    ]);
    greeting = reply;
  } else {
    greeting = getFallbackGreeting(selectedRole, selectedDifficulty);
  }

  messages.push({ role: 'assistant', content: greeting });

  return {
    role: selectedRole,
    difficulty: selectedDifficulty,
    messages,
    greeting,
  };
}

function getRoleFromMessages(messages) {
  const system = messages.find((m) => m.role === 'system');
  const match = system?.content?.match(/mock interview for a (.+?) position/);
  return match?.[1] || 'this role';
}

async function sendMessage({ messages, content }) {
  if (!content?.trim()) {
    const error = new Error('Message content is required');
    error.status = 400;
    throw error;
  }

  const updatedMessages = [
    ...messages,
    { role: 'user', content: content.trim() },
  ];

  const userTurns = updatedMessages.filter((m) => m.role === 'user').length;

  let reply;

  if (OPENAI_API_KEY) {
    const apiMessages =
      userTurns === 1
        ? [
            ...updatedMessages,
            {
              role: 'user',
              content:
                'The candidate has completed their introduction above. Acknowledge it briefly, then ask your first role-relevant interview question.',
            },
          ]
        : updatedMessages;

    reply = await callOpenAI(apiMessages);
  } else {
    reply = getFallbackReply(userTurns, getRoleFromMessages(messages));
  }

  updatedMessages.push({ role: 'assistant', content: reply });

  return {
    messages: updatedMessages,
    reply,
  };
}

async function endInterview({ role, difficulty, messages }) {
  const selectedRole = role || 'Software Engineer';
  const selectedDifficulty = difficulty || 'Medium';

  if (!messages?.length) {
    const error = new Error('Interview messages are required');
    error.status = 400;
    throw error;
  }

  let feedback;

  if (OPENAI_API_KEY) {
    try {
      const raw = await callOpenAI(
        [
          {
            role: 'system',
            content: buildFeedbackPrompt(selectedRole, selectedDifficulty, messages),
          },
        ],
        { json: true }
      );
      feedback = JSON.parse(raw);
    } catch {
      feedback = getFallbackFeedback(selectedRole);
    }
  } else {
    feedback = getFallbackFeedback(selectedRole);
  }

  return {
    role: selectedRole,
    difficulty: selectedDifficulty,
    feedback,
  };
}

function getOptions() {
  return {
    roles: INTERVIEW_ROLES,
    difficulties: DIFFICULTY_LEVELS,
  };
}

module.exports = {
  startInterview,
  sendMessage,
  endInterview,
  getOptions,
};
