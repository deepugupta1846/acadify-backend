const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const INTERVIEW_ROLE_GROUPS = [
  {
    id: 'roles',
    label: 'Job Roles',
    items: [
      'Web Developer',
      'Frontend Developer',
      'Backend Developer',
      'Full Stack Developer',
      'Software Engineer',
      'Mobile Developer',
      'iOS Developer',
      'Android Developer',
      'Data Analyst',
      'Data Scientist',
      'Machine Learning Engineer',
      'Product Manager',
      'Project Manager',
      'Scrum Master',
      'UI/UX Designer',
      'Graphic Designer',
      'DevOps Engineer',
      'Cloud Engineer',
      'Cybersecurity Analyst',
      'Business Analyst',
      'QA Engineer',
      'Technical Writer',
      'Digital Marketing',
      'Content Writer',
      'SEO Specialist',
      'HR Recruiter',
      'Customer Support Executive',
    ],
  },
  {
    id: 'skills',
    label: 'Skills',
    items: [
      'Communication Skills',
      'Leadership',
      'Problem Solving',
      'Teamwork & Collaboration',
      'Time Management',
      'Critical Thinking',
      'Presentation Skills',
      'Negotiation',
      'Conflict Resolution',
      'Adaptability',
      'Emotional Intelligence',
      'Active Listening',
      'Public Speaking',
      'Resume & Interview Skills',
      'Analytical Thinking',
      'Creativity & Innovation',
      'Decision Making',
      'Work Ethic',
      'Soft Skills',
    ],
  },
  {
    id: 'languages',
    label: 'Languages',
    items: [
      'English',
      'Hindi',
      'Spanish',
      'French',
      'German',
      'Mandarin Chinese',
      'Japanese',
      'Korean',
      'Arabic',
      'Portuguese',
      'Russian',
      'Bengali',
      'Tamil',
      'Telugu',
      'Marathi',
      'Gujarati',
      'Punjabi',
      'Italian',
      'Dutch',
      'Urdu',
    ],
  },
];

const INTERVIEW_ROLES = INTERVIEW_ROLE_GROUPS.flatMap((group) => group.items);

const DIFFICULTY_LEVELS = ['Easy', 'Medium', 'Hard'];

const EXPERIENCE_LEVELS = ['Fresher', 'Mid-Level', 'Experienced'];

function getRoleCategory(role) {
  const group = INTERVIEW_ROLE_GROUPS.find((entry) => entry.items.includes(role));
  return group?.id || 'roles';
}

function getExperienceGuidance(experienceLevel) {
  const level = EXPERIENCE_LEVELS.includes(experienceLevel)
    ? experienceLevel
    : 'Fresher';

  const guidance = {
    Fresher:
      'Candidate level: FRESHER (0-1 years, student, or career starter). Ask foundational and entry-level questions — basics, academics, internships, personal projects, motivation, and learning ability. Be encouraging and avoid senior or architecture-heavy questions.',
    'Mid-Level':
      'Candidate level: MID-LEVEL (1-3 years). Ask practical, hands-on questions about real projects, collaboration, problem-solving, and moderate technical depth appropriate for someone with some industry experience.',
    Experienced:
      'Candidate level: EXPERIENCED (3+ years). Ask advanced questions — deep technical depth, system design, leadership, ownership, metrics, trade-offs, mentoring, and high-impact examples from past roles.',
  };

  return guidance[level];
}

function buildSystemPrompt(role, difficulty, experienceLevel) {
  const category = getRoleCategory(role);
  const experienceGuide = getExperienceGuidance(experienceLevel);

  if (category === 'languages') {
    return `You are a professional ${role} language proficiency interviewer at ${difficulty} difficulty.

${experienceGuide}

Interview flow (IMPORTANT — follow this order):
1. Your FIRST message must ONLY greet the candidate and ask them to introduce themselves briefly in ${role}. Do not ask assessment questions yet.
2. AFTER the introduction, briefly acknowledge (1 sentence), then begin ${role} proficiency questions appropriate for ${difficulty} difficulty AND the candidate's experience level above.
3. Ask one question at a time. You may use ${role} for questions and accept answers in ${role}.

Rules:
- Ask one clear question at a time.
- After each answer, briefly acknowledge (1 sentence) then ask the next question.
- Keep each response under 120 words.
- Be encouraging and constructive.
- Tailor vocabulary and complexity to both ${difficulty} difficulty and the candidate's experience level.`;
  }

  if (category === 'skills') {
    return `You are a professional interviewer assessing ${role} at ${difficulty} difficulty.

${experienceGuide}

Interview flow (IMPORTANT — follow this order):
1. Your FIRST message must ONLY include a warm greeting and ask the candidate to introduce themselves. Do not ask skill questions yet.
2. AFTER the introduction, briefly acknowledge (1 sentence), then ask behavioral and situational questions that evaluate ${role} at a level matching their experience above.
3. Continue with STAR-style follow-ups appropriate for ${difficulty} difficulty, one question at a time.

Rules:
- Ask one clear question at a time.
- After each answer, briefly acknowledge (1 sentence) then ask the next question.
- Keep each response under 120 words.
- Be professional, encouraging, and constructive.
- Focus on real examples and measurable outcomes suited to their experience level.`;
  }

  return `You are a professional interviewer conducting a mock interview for a ${role} position at ${difficulty} difficulty.

${experienceGuide}

Interview flow (IMPORTANT — follow this order):
1. Your FIRST message must ONLY include a warm greeting and ask the candidate to introduce themselves (e.g. background, education, experience, interest in this role). Do not ask any technical or behavioral questions in the first message.
2. AFTER the candidate introduces themselves, briefly acknowledge their introduction (1 sentence), then ask your first role-relevant question suited to their experience level above.
3. Continue with behavioral and ${role}-specific questions appropriate for ${difficulty} difficulty and their experience level, one question at a time.

Rules:
- Ask one clear question at a time.
- After each answer, briefly acknowledge (1 sentence) then ask the next question.
- Keep each response under 120 words.
- Be professional, encouraging, and constructive.
- Do not provide full answers to technical questions — guide with follow-ups instead.
- Fresher candidates: basics, projects, fundamentals. Experienced candidates: depth, impact, and leadership.`;
}

function buildFeedbackPrompt(role, difficulty, experienceLevel, messages) {
  const transcript = messages
    .filter((m) => m.role !== 'system')
    .map((m) => `${m.role === 'assistant' ? 'Interviewer' : 'Candidate'}: ${m.content}`)
    .join('\n\n');

  return `You are an expert career coach. Review this mock interview transcript for a ${role} role (${difficulty} difficulty, ${experienceLevel} experience level) and provide structured feedback.

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

function getFallbackGreeting(role, difficulty, experienceLevel) {
  return `Hello! Welcome to your ${role} mock interview. I'll be your AI interviewer today for a ${experienceLevel} candidate at ${difficulty} difficulty. Let's start — please introduce yourself. Tell me about your background, experience, and why you're interested in this role.`;
}

function getFallbackReply(userTurns, role, experienceLevel) {
  const fresherFollowUps = [
    `Thank you for introducing yourself. What motivated you to pursue ${role}, and what have you learned so far?`,
    'Can you tell me about an academic project, internship, or personal project you are proud of?',
    'How do you approach learning a new tool or technology?',
    'Describe a time you worked in a team — what was your contribution?',
    'Where do you see yourself in the next two years?',
  ];

  const experiencedFollowUps = [
    `Thank you for introducing yourself. What is the most impactful ${role} project you have led or contributed to?`,
    'Can you walk me through a complex technical decision you made and the trade-offs involved?',
    'How do you mentor juniors or collaborate across teams?',
    'Tell me about a production issue or failure you handled — what was the outcome?',
    'Why are you looking for a new opportunity at this stage of your career?',
  ];

  const followUps =
    experienceLevel === 'Experienced' ? experiencedFollowUps : fresherFollowUps;

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

async function startInterview({ role, difficulty, experienceLevel }) {
  const selectedRole = INTERVIEW_ROLES.includes(role) ? role : INTERVIEW_ROLES[0];
  const selectedDifficulty = DIFFICULTY_LEVELS.includes(difficulty)
    ? difficulty
    : 'Medium';
  const selectedExperience = EXPERIENCE_LEVELS.includes(experienceLevel)
    ? experienceLevel
    : 'Fresher';

  const systemPrompt = buildSystemPrompt(
    selectedRole,
    selectedDifficulty,
    selectedExperience
  );
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
    greeting = getFallbackGreeting(
      selectedRole,
      selectedDifficulty,
      selectedExperience
    );
  }

  messages.push({ role: 'assistant', content: greeting });

  return {
    role: selectedRole,
    difficulty: selectedDifficulty,
    experienceLevel: selectedExperience,
    messages,
    greeting,
  };
}

function getRoleFromMessages(messages) {
  const system = messages.find((m) => m.role === 'system');
  const match = system?.content?.match(/mock interview for a (.+?) position/);
  return match?.[1] || 'this role';
}

function getExperienceFromMessages(messages) {
  const system = messages.find((m) => m.role === 'system');
  if (!system?.content) return 'Fresher';

  if (system.content.includes('FRESHER')) return 'Fresher';
  if (system.content.includes('EXPERIENCED')) return 'Experienced';
  if (system.content.includes('MID-LEVEL')) return 'Mid-Level';
  return 'Fresher';
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
    reply = getFallbackReply(
      userTurns,
      getRoleFromMessages(messages),
      getExperienceFromMessages(messages)
    );
  }

  updatedMessages.push({ role: 'assistant', content: reply });

  return {
    messages: updatedMessages,
    reply,
  };
}

async function endInterview({ role, difficulty, experienceLevel, messages }) {
  const selectedRole = role || 'Software Engineer';
  const selectedDifficulty = difficulty || 'Medium';
  const selectedExperience = experienceLevel || 'Fresher';

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
            content: buildFeedbackPrompt(
              selectedRole,
              selectedDifficulty,
              selectedExperience,
              messages
            ),
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
    experienceLevel: selectedExperience,
    feedback,
  };
}

function getOptions() {
  return {
    roles: INTERVIEW_ROLES,
    roleGroups: INTERVIEW_ROLE_GROUPS,
    difficulties: DIFFICULTY_LEVELS,
    experienceLevels: EXPERIENCE_LEVELS,
  };
}

module.exports = {
  startInterview,
  sendMessage,
  endInterview,
  getOptions,
};
