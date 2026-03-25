import { NextResponse } from 'next/server'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface RequestBody {
  messages: Message[]
  context: string
}

const SYSTEM_PROMPT = `Ты — AI-ассистент внутри системы управления задачами Taskly.
Тебе предоставлен актуальный контекст проекта: задачи, участники, статусы, результаты оптимизации.

ПРАВИЛА:
- Отвечай коротко и по делу (2–5 предложений, не больше).
- Используй данные из контекста — не выдумывай.
- Если спрашивают про конкретные задачи/людей — ссылайся на реальные данные.
- Отвечай на том языке, на котором задан вопрос (русский или английский).
- Не используй markdown заголовки (#, ##). Можно жирный (**текст**) и списки.
- Если данных недостаточно — так и скажи честно.
- Не повторяй весь контекст обратно — только отвечай на вопрос.`

export async function POST(req: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY не задан. Добавь его в .env.local — получи ключ на console.anthropic.com' },
        { status: 500 }
      )
    }

    let body: RequestBody
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Невалидный JSON в теле запроса' }, { status: 400 })
    }

    const { messages, context } = body

    if (!messages?.length) {
      return NextResponse.json({ error: 'Поле messages обязательно' }, { status: 400 })
    }

    // Добавляем контекст проекта в первое сообщение пользователя
    const messagesWithContext = messages.map((msg, i) => {
      if (i === 0 && msg.role === 'user') {
        return {
          ...msg,
          content: `${context}\n\n---\n\nВОПРОС: ${msg.content}`,
        }
      }
      return msg
    })

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system: SYSTEM_PROMPT,
        messages: messagesWithContext,
      }),
    })

    if (res.status === 401) {
      return NextResponse.json(
        { error: 'Невалидный ANTHROPIC_API_KEY — проверь .env.local' },
        { status: 500 }
      )
    }
    if (res.status === 429) {
      return NextResponse.json(
        { error: 'Превышен лимит запросов — подожди немного и попробуй снова' },
        { status: 429 }
      )
    }
    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Anthropic API error ${res.status}: ${errText}`)
    }

    const data = await res.json()
    const reply: string = data.content?.[0]?.text ?? ''

    if (!reply.trim()) {
      return NextResponse.json({ error: 'AI вернул пустой ответ — попробуй снова' }, { status: 500 })
    }

    return NextResponse.json({ reply: reply.trim() })
  } catch (err: any) {
    console.error('AI chat error:', err)
    return NextResponse.json(
      { error: err?.message ?? 'Что-то пошло не так' },
      { status: 500 }
    )
  }
}