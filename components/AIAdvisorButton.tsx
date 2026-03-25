'use client'
import React, { useState, useEffect, useRef } from 'react'
import { Task, ProjectMember, OptimizationResult } from '@/types'

interface Props {
  tasks: Task[]
  members: ProjectMember[]
  currentUserId?: string
  startDate?: string
  optResult?: OptimizationResult | null
}

function getTodayDayIndex(startDate?: string): number {
  const projectStart = startDate ? new Date(startDate) : new Date()
  projectStart.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((today.getTime() - projectStart.getTime()) / 86400000) + 1
}

function getScheduleMap(optResult: OptimizationResult | null | undefined) {
  const map = new Map<string, {
    startDay: number; endDay: number; workerId: string
    startHour?: number; endHour?: number; workerHpd?: number
  }>()
  if (!optResult) return map
  for (const ws of optResult.schedule) {
    for (const at of ws.assigned_tasks) {
      const extra = at as any
      map.set(at.task_id, {
        startDay: at.start_day,
        endDay: at.end_day,
        workerId: ws.user_id,
        startHour: typeof extra.start_hour === 'number' ? extra.start_hour : undefined,
        endHour:   typeof extra.end_hour   === 'number' ? extra.end_hour   : undefined,
        workerHpd: ws.hours_per_day,
      })
    }
  }
  return map
}

const WEEKDAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

const LOADING_STEPS = [
  { icon: '🔍', text: 'Analyzing tasks...' },
  { icon: '📊', text: 'Calculating workload...' },
  { icon: '🤖', text: 'Generating AI advice...' },
]

function WorkloadBar({ pct }: { pct: number }) {
  const clamped = Math.min(100, Math.max(0, pct))
  const color = clamped >= 90 ? '#ef4444' : clamped >= 70 ? '#f59e0b' : '#6366f1'
  const bg    = clamped >= 90 ? '#fef2f2' : clamped >= 70 ? '#fffbeb' : '#eef2ff'
  const label = clamped >= 90 ? 'High load' : clamped >= 70 ? 'Moderate' : 'On track'

  return (
    <div className="rounded-xl p-4 mb-5" style={{ background: bg, border: `1px solid ${color}22` }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Workload today</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: color + '18', color }}>
            {label}
          </span>
          <span className="text-xl font-black" style={{ color }}>{clamped}%</span>
        </div>
      </div>
      <div className="h-2 rounded-full bg-white" style={{ boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.08)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${clamped}%`, background: color }}
        />
      </div>
    </div>
  )
}

export default function AIAdvisorButton({ tasks, members, currentUserId, startDate, optResult }: Props) {
  const [open, setOpen] = useState(false)
  const [loadingStep, setLoadingStep] = useState(-1)
  const [advice, setAdvice] = useState<string | null>(null)
  const [workloadPct, setWorkloadPct] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const stepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (stepTimerRef.current) clearTimeout(stepTimerRef.current) }, [])

  const member = members.find(m => m.user_id === currentUserId) ?? members[0]

  function handleOpen() {
    setOpen(true)
    setAdvice(null)
    setError(null)
    setLoadingStep(0)
    runAdvisor()
  }

  function handleClose() {
    setOpen(false)
    setLoadingStep(-1)
  }

  async function runAdvisor() {
    try {
      const todayIdx = getTodayDayIndex(startDate)
      const schedMap = getScheduleMap(optResult)
      const hpd = Number(member?.hours_per_day) || 8

      const tasksToday = tasks.filter(t => {
        const s = schedMap.get(t.id)
        return s && s.workerId === (member?.user_id ?? '') && todayIdx >= s.startDay && todayIdx <= s.endDay
      })

      const upcomingTasks = tasks.filter(t => {
        const s = schedMap.get(t.id)
        return s && s.workerId === (member?.user_id ?? '') && s.startDay > todayIdx && s.startDay <= todayIdx + 3
      })

      const hoursToday = tasksToday.reduce((sum, t) => {
        const s = schedMap.get(t.id)
        if (!s) return sum
        if (s.startHour !== undefined && s.endHour !== undefined) {
          const durationH = s.endHour - s.startHour
          const daysSpan = s.endDay - s.startDay + 1
          return sum + durationH / daysSpan
        }
        return sum + Number(t.duration) / Math.max(1, s.endDay - s.startDay + 1)
      }, 0)

      const pct = Math.round((hoursToday / hpd) * 100)
      setWorkloadPct(pct)

      const weekday = WEEKDAYS[new Date().getDay()]
      const todayStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

      for (let i = 1; i < LOADING_STEPS.length; i++) {
        await new Promise<void>(res => { stepTimerRef.current = setTimeout(res, 900) })
        setLoadingStep(i)
      }

      const res = await fetch('/api/ai/advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workerName: member?.username ?? 'Worker',
          today: todayStr,
          weekday,
          workloadPct: pct,
          hoursPerDay: hpd,
          workerSkills: member?.skills ?? [],
          tasksToday: tasksToday.map(t => ({
            name: t.name, skill: t.skill, duration: t.duration,
            priority: t.priority, deadline_days: t.deadline_days,
          })),
          upcomingTasks: upcomingTasks.map(t => {
            const s = schedMap.get(t.id)
            return {
              name: t.name, skill: t.skill, duration: t.duration,
              priority: t.priority, deadline_days: t.deadline_days,
              startsInDays: s ? s.startDay - todayIdx : null,
            }
          }),
        }),
      })

      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setAdvice(data.advice)
      setLoadingStep(-1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoadingStep(-1)
    }
  }

  const isLoading = loadingStep >= 0

  return (
    <>
      {/* Trigger button — matches btn-secondary style */}
      <button
        onClick={handleOpen}
        className="btn-secondary text-sm flex items-center gap-2"
      >
        AI Advisor
      </button>

      {open && (
        <div
          onClick={handleClose}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(2px)' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            style={{ animation: 'slideUp 0.2s cubic-bezier(0.34,1.56,0.64,1)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-lg">
                  🧠
                </div>
                <div>
                  <div className="font-semibold text-slate-800 text-sm">AI Advisor — Today</div>
                  <div className="text-xs text-slate-400">
                    {member?.username ?? 'Worker'} · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </div>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="text-slate-300 hover:text-slate-500 text-xl leading-none transition-colors"
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5">

              {/* Workload bar */}
              {!isLoading && (advice || error) && (
                <WorkloadBar pct={workloadPct} />
              )}

              {/* Loading */}
              {isLoading && (
                <div className="py-4 space-y-3">
                  {LOADING_STEPS.map((step, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 transition-opacity duration-300"
                      style={{ opacity: i <= loadingStep ? 1 : 0.3 }}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm border transition-all duration-300 ${
                        i < loadingStep
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                          : i === loadingStep
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}>
                        {i < loadingStep ? '✓' : step.icon}
                      </div>
                      <span className={`text-sm font-medium transition-colors duration-300 ${
                        i === loadingStep ? 'text-indigo-700' : i < loadingStep ? 'text-slate-400' : 'text-slate-300'
                      }`}>
                        {step.text}
                      </span>
                      {i === loadingStep && (
                        <div className="ml-auto flex gap-1">
                          {[0,1,2].map(d => (
                            <div key={d} className="w-1.5 h-1.5 rounded-full bg-indigo-400"
                              style={{ animation: `pulse 1.2s ease-in-out ${d * 0.2}s infinite` }} />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Error */}
              {error && !isLoading && (
                <div className="rounded-xl p-4 bg-red-50 border border-red-100 text-red-600 text-sm">
                  ⚠ {error}
                </div>
              )}

              {/* Advice */}
              {advice && !isLoading && (
                <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {advice}
                </div>
              )}
            </div>

            {/* Footer */}
            {!isLoading && (advice || error) && (
              <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                <span className="text-xs text-slate-400">Powered by NurdauletEsenbay</span>
                <button onClick={handleClose} className="btn-secondary text-xs">Close</button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.98) }
          to   { opacity: 1; transform: translateY(0) scale(1) }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8) }
          50% { opacity: 1; transform: scale(1.2) }
        }
      `}</style>
    </>
  )
}