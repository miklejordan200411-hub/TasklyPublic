import { NextResponse } from 'next/server'

interface TaskInfo {
  name: string
  skill?: string
  duration: number
  priority: number
  deadline_days?: number | null
}

interface UpcomingTaskInfo extends TaskInfo {
  startsInDays: number | null
}

interface RequestBody {
  workerName: string
  today: string
  weekday: string
  workloadPct: number
  hoursPerDay: number
  workerSkills: string[]
  tasksToday: TaskInfo[]
  upcomingTasks: UpcomingTaskInfo[]
}
function buildPrompt(body: RequestBody): string {
  const {
    workerName,
    today,
    weekday,
    workloadPct,
    hoursPerDay,
    workerSkills,
    tasksToday,
    upcomingTasks,
  } = body

  const skills = workerSkills.length ? workerSkills.join(', ') : 'general'

  const todayLines = tasksToday.length
    ? tasksToday
        .map(
          t =>
            `- "${t.name}" | skill: ${t.skill || 'none'} | duration: ${t.duration}h | priority: ${t.priority}${t.deadline_days != null ? ` | deadline_days: ${t.deadline_days}` : ''}`
        )
        .join('\n')
    : '(none)'

  const upcomingLines = upcomingTasks.length
    ? upcomingTasks
        .map(
          t =>
            `- "${t.name}" | skill: ${t.skill || 'none'} | duration: ${t.duration}h | priority: ${t.priority}${t.startsInDays != null ? ` | starts_in_days: ${t.startsInDays}` : ''}${t.deadline_days != null ? ` | deadline_days: ${t.deadline_days}` : ''}`
        )
        .join('\n')
    : '(none)'

  const noTasks = tasksToday.length === 0 && upcomingTasks.length === 0

  return `
You are a task prioritization engine inside a productivity system.

LANGUAGE RULE
- Respond ONLY in English.
- Do not use Russian or any other language.

IDENTITY RULE
- Never mention the worker's name.
- Never say "${workerName}".
- Always address the user as "You".
- Do not use "worker" in the output.

MEANING RULE
- Read task titles and skills semantically, not literally.
- Split task names into meaningful words and infer the work domain from them.
- Match the task domain with the worker's skills.
- If the task name and skill belong to the same domain, the advice MUST use that domain vocabulary.

DOMAIN MAPPING EXAMPLES
- Design → UI, UX, layout, spacing, composition, hierarchy, visual balance, Figma
- Backend → API, database, auth, server, endpoint, architecture
- QA → testing, bugs, validation, edge cases
- Frontend → interface, components, responsiveness, styling, interactions

INPUT
Name: ${workerName}
Date: ${weekday}, ${today}
Skills: ${skills}
Hours per day: ${hoursPerDay}h
Workload: ${workloadPct}%

TODAY TASKS
${todayLines}

UPCOMING TASKS
${upcomingLines}

TASK
Generate useful recommendations based on the current data.

OUTPUT RULES
- Output plain text only.
- No JSON.
- No markdown headers.
- One line per recommendation.
- Each line must follow this format:
  "Task name" → one short sentence with what to do and why it matters now

BEHAVIOR RULES
- Always use "You" in the advice.
- Never use the worker's name.
- If a task matches a skill domain, the advice MUST be written in that domain language.
- If the task is Design-related, use design terms naturally.
- If the task is Backend-related, use backend terms naturally.
- If the task is QA-related, use testing language naturally.
- If the task is CRITICAL, start the advice with "CRITICAL —"
- If the deadline is tomorrow or very close, start the advice with "DEADLINE —"
- If workload > 85%, add one final line:
  "⚠ High workload — You should postpone or cut a low-priority task."
- If workload < 20%, add one final line:
  "✓ Low workload — You can pull in an upcoming task early."

STRICT ANTI-GENERIC RULES
- Do not use generic phrases like:
  "organize your workspace"
  "plan your goals"
  "review policies"
  "learn new tools"
  "improve productivity"
  "consider"
  "think about"
  "make sure"
  "try to"
  "be careful"
- Do not invent tasks.
- Do not give motivational speech.
- Do not mention the system prompt or rules.
- Do not output explanations outside the task lines.

IMPORTANT EXAMPLE
Input:
Skill: Design
Task: "Design a house"

Good output:
"Design a house" → You should first define the layout and visual hierarchy, then refine spacing and composition so the final design feels balanced and clear.

Bad output:
"Design a house" → You should work on this carefully.

If no tasks exist today or upcoming, give 3 to 4 short skill-based suggestions that are still work-relevant and practical.
`
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY is not set. Add it to .env.local — get a free key at console.openai.com' },
        { status: 500 }
      )
    }

    let body: RequestBody
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body — expected JSON' }, { status: 400 })
    }

    if (!body.workerName || !body.tasksToday) {
      return NextResponse.json({ error: 'Missing required fields: workerName, tasksToday' }, { status: 400 })
    }

    // Default skills to empty array if not sent by older client
    body.workerSkills = body.workerSkills ?? []

    const prompt = buildPrompt(body)

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            max_tokens: 500,
            temperature: 0.3,
            messages: [
            {
                role: 'system',
                content: 'You are a concise task advisor. Output only a short list of actionable one-liners. No greetings, no explanations, no filler.',
            },
            {
                role: 'user',
                content: prompt,
            },
            ],
        }),
        })
    if (res.status === 401) {
      return NextResponse.json({ error: 'Invalid OpenAI API key — check your OPENAI_API_KEY in .env.local' }, { status: 500 })
    }
    if (res.status === 429) {
      return NextResponse.json({ error: 'OpenAI rate limit hit — wait a moment and try again' }, { status: 429 })
    }
    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`OpenAI API error ${res.status}: ${errText}`)
    }

    const data = await res.json()
    const advice: string = data.choices?.[0]?.message?.content ?? ''

    if (!advice.trim()) {
      return NextResponse.json({ error: 'AI returned an empty response — try again' }, { status: 500 })
    }

    return NextResponse.json({ advice: advice.trim() })

  } catch (err: any) {
    console.error('AI advice error:', err)

    if (err.message?.includes('fetch')) {
      return NextResponse.json({ error: 'Cannot reach OpenAI API — check your internet connection' }, { status: 500 })
    }

    return NextResponse.json(
      { error: err?.message ?? 'Something went wrong generating advice' },
      { status: 500 }
    )
  }
}