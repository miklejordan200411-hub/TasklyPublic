'use client'
import React, { useState, useRef, useEffect } from 'react'
import { Task, ProjectMember, OptimizationResult } from '@/types'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  tasks: Task[]
  members: ProjectMember[]
  projectName?: string
  currentUserId?: string
  optResult?: OptimizationResult | null
  isManager?: boolean
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1 px-1">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block"
          style={{ animation: `chatDot 1.2s ease-in-out ${i * 0.2}s infinite` }}
        />
      ))}
    </div>
  )
}

const QUICK_QUESTIONS = [
  'Какие задачи сейчас заблокированы?',
  'Кто перегружен?',
  'Какие дедлайны ближайшие?',
  'Посоветуй с чего начать',
]

export default function AIChatBot({
  tasks,
  members,
  projectName,
  currentUserId,
  optResult,
  isManager,
}: Props) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Привет! Я AI-ассистент проекта **${projectName || 'Taskly'}**.\n\nЯ знаю все задачи, участников и статусы. Задавай вопросы — отвечу по существу.`,
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }, [messages, open, loading])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  function buildContext() {
    const taskLines = tasks.map(t => {
      const assignee = members.find(m => m.user_id === t.assigned_to)?.username ?? 'не назначен'
      const deps = t.depends_on?.length ? ` | depends_on: ${t.depends_on.length} tasks` : ''
      return `- [${t.status}] "${t.name}" | skill: ${t.skill} | priority: ${t.priority} | duration: ${t.duration}h | assignee: ${assignee}${t.deadline_days != null ? ` | deadline_days: ${t.deadline_days}` : ''}${deps}`
    }).join('\n') || '(нет задач)'

    const memberLines = members.map(m =>
      `- ${m.username} (${m.role}) | skills: ${m.skills?.join(', ') || '—'} | hours/day: ${m.hours_per_day}`
    ).join('\n') || '(нет участников)'

    const optLines = optResult
      ? optResult.schedule.map(ws =>
          `- ${ws.username}: ${ws.assigned_tasks.length} tasks, utilization ${ws.utilization_percent}%`
        ).join('\n')
      : '(оптимизация не запускалась)'

    const warnings = optResult?.warnings?.length
      ? optResult.warnings.map(w => `- ${w}`).join('\n')
      : '(нет предупреждений)'

    return `ПРОЕКТ: ${projectName || 'Taskly'}
РОЛЬ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ: ${isManager ? 'manager' : 'worker'}

=== ЗАДАЧИ (${tasks.length}) ===
${taskLines}

=== УЧАСТНИКИ (${members.length}) ===
${memberLines}

=== РЕЗУЛЬТАТ ОПТИМИЗАЦИИ ===
${optLines}

=== ПРЕДУПРЕЖДЕНИЯ ОПТИМИЗАЦИИ ===
${warnings}`
  }

  async function send(text?: string) {
    const trimmed = (text ?? input).trim()
    if (!trimmed || loading) return

    const userMsg: Message = { role: 'user', content: trimmed }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          context: buildContext(),
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Ошибка сервера')
      }

      const data = await res.json()
      setMessages([...newMessages, { role: 'assistant', content: data.reply }])
    } catch (e: any) {
      setMessages([...newMessages, {
        role: 'assistant',
        content: `⚠ ${e.message ?? 'Что-то пошло не так. Попробуй ещё раз.'}`,
      }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const unread = !open && messages.length > 1

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-6 right-6 z-50 w-13 h-13 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg flex items-center justify-center text-xl transition-all duration-200 hover:scale-105 active:scale-95"
        style={{ width: 52, height: 52 }}
        title="AI Chat"
      >
        {open ? '✕' : '💬'}
        {unread && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div
          className="fixed bottom-20 right-6 z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
          style={{ height: 520, animation: 'chatSlideUp 0.2s cubic-bezier(0.34,1.56,0.64,1)' }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-indigo-600 text-white flex-shrink-0">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-base">🧠</div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">AI Ассистент</div>
              <div className="text-xs text-indigo-200 truncate">{projectName}</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/60 hover:text-white text-lg leading-none transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                style={{ animation: 'chatFadeIn 0.2s ease' }}
              >
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center text-xs mr-2 flex-shrink-0 mt-0.5">🧠</div>
                )}
                <div
                  className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-sm'
                      : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center text-xs flex-shrink-0">🧠</div>
                <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-3 py-2">
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick questions */}
          {messages.length <= 1 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5 flex-shrink-0">
              {QUICK_QUESTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="flex items-end gap-2 px-3 py-3 border-t border-slate-100 flex-shrink-0">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Спроси про задачи, участников..."
              rows={1}
              disabled={loading}
              className="flex-1 input text-sm py-2 resize-none min-h-[36px] max-h-[100px]"
              style={{ lineHeight: 1.5 }}
              onInput={e => {
                const el = e.currentTarget
                el.style.height = 'auto'
                el.style.height = Math.min(el.scrollHeight, 100) + 'px'
              }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="btn-primary px-3 py-2 text-sm flex-shrink-0 disabled:opacity-40"
            >
              ↑
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(12px) scale(0.97) }
          to   { opacity: 1; transform: translateY(0) scale(1) }
        }
        @keyframes chatFadeIn {
          from { opacity: 0; transform: translateY(4px) }
          to   { opacity: 1; transform: translateY(0) }
        }
        @keyframes chatDot {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.4 }
          40% { transform: scale(1.2); opacity: 1 }
        }
      `}</style>
    </>
  )
}