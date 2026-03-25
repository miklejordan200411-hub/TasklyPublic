'use client'
import React, { useState } from 'react'
import { Task, ProjectMember, OptimizationResult } from '@/types'

interface Props {
  tasks: Task[]
  members: ProjectMember[]
  onTaskClick: (task: Task) => void
  startDate?: string
  optResult?: OptimizationResult | null
}

// ─── Colors ───────────────────────────────────────────────────────────────────
const COLOR_PALETTE = [
  { bg: '#0F6E56', border: '#1D9E75', text: '#9FE1CB' },
  { bg: '#185FA5', border: '#378ADD', text: '#B5D4F4' },
  { bg: '#534AB7', border: '#7F77DD', text: '#CECBF6' },
  { bg: '#993C1D', border: '#D85A30', text: '#F5C4B3' },
  { bg: '#3B6D11', border: '#639922', text: '#C0DD97' },
  { bg: '#854F0B', border: '#BA7517', text: '#FAC775' },
  { bg: '#993556', border: '#D4537E', text: '#F4C0D1' },
]
const FALLBACK_COLOR = { bg: '#5F5E5A', border: '#888780', text: '#D3D1C7' }

function buildColorMap(tasks: Task[]) {
  const skills = Array.from(new Set(tasks.map(t => t.skill?.toLowerCase().trim()).filter(Boolean) as string[]))
  const map = new Map<string, typeof FALLBACK_COLOR>()
  skills.forEach((s, i) => map.set(s, COLOR_PALETTE[i % COLOR_PALETTE.length]))
  return map
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r }
function startOfWeek(d: Date) { const r = new Date(d); r.setDate(r.getDate() - ((r.getDay() + 6) % 7)); r.setHours(0,0,0,0); return r }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1) }
function sameDay(a: Date, b: Date) { return a.toDateString() === b.toDateString() }
function toInputVal(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
function fmtDay(d: Date) { return `${DAYS_SHORT[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}` }

// ─── Schedule builder ─────────────────────────────────────────────────────────
interface SchedEntry { startDay: number; endDay: number; userId: string; startHour: number; endHour: number; workerHpd: number }

function topoSort(tasks: Task[], depMap: Map<string, string[]>): Task[] {
  const byId = new Map(tasks.map(t => [t.id, t]))
  const visited = new Set<string>()
  const out: Task[] = []
  function visit(id: string) {
    if (visited.has(id)) return; visited.add(id)
    for (const d of depMap.get(id) ?? []) if (byId.has(d)) visit(d)
    const t = byId.get(id); if (t) out.push(t)
  }
  for (const t of [...tasks].sort((a,b) => b.priority - a.priority)) visit(t.id)
  return out
}

function buildSchedule(tasks: Task[], members: ProjectMember[], depMap: Map<string, string[]>): Map<string, SchedEntry> {
  const result = new Map<string, SchedEntry>()
  const workerHour = new Map<string, number>()
  const taskEndHour = new Map<string, number>()
  for (const task of topoSort(tasks, depMap)) {
    if (!task.assigned_to) continue
    const member = members.find(m => m.user_id === task.assigned_to)
    if (!member) continue
    const hpd = Math.max(1, Number(member.hours_per_day) || 8)
    const duration = Math.max(0.5, Number(task.duration))
    let depEarliest = 0
    for (const depId of depMap.get(task.id) ?? []) { const h = taskEndHour.get(depId); if (h !== undefined) depEarliest = Math.max(depEarliest, h) }
    let startHour = Math.max(workerHour.get(task.assigned_to) ?? 0, depEarliest)
    const dayStart = Math.floor(startHour / hpd) * hpd
    const used = startHour - dayStart
    if (duration > hpd - used && used > 0) startHour = dayStart + hpd
    const endHour = startHour + duration
    workerHour.set(task.assigned_to, endHour)
    taskEndHour.set(task.id, endHour)
    result.set(task.id, { startDay: Math.floor(startHour/hpd)+1, endDay: Math.max(Math.floor(startHour/hpd)+1, Math.ceil(endHour/hpd)), userId: task.assigned_to, startHour, endHour, workerHpd: hpd })
  }
  return result
}

function getScheduleMap(tasks: Task[], members: ProjectMember[], optResult: OptimizationResult | null | undefined, depMap: Map<string, string[]>): Map<string, SchedEntry> {
  if (optResult) {
    const m = new Map<string, SchedEntry>()
    for (const ws of optResult.schedule) {
      const hpd = Number(ws.hours_per_day) || 8
      for (const at of ws.assigned_tasks) {
        const startHour = (at as any).start_hour ?? (at.start_day - 1) * hpd
        const endHour = (at as any).end_hour ?? startHour + at.duration
        m.set(at.task_id, { startDay: at.start_day, endDay: at.end_day, userId: ws.user_id, startHour, endHour, workerHpd: hpd })
      }
    }
    return m
  }
  return buildSchedule(tasks, members, depMap)
}

// ─── Day View ─────────────────────────────────────────────────────────────────
function DayView({ tasks, members, onTaskClick, projectStart, viewDate, scheduleMap, colorMap }: any) {
  const today = new Date(); today.setHours(0,0,0,0)
  const isToday = sameDay(viewDate, today)
  const now = new Date()
  const currentHour = now.getHours() + now.getMinutes() / 60
  const viewDay = Math.round((viewDate.getTime() - projectStart.getTime()) / 86400000) + 1

  const dayTasksByMember = new Map<string, {task: Task; sched: SchedEntry}[]>()
  for (const m of members) dayTasksByMember.set(m.user_id, [])
  for (const task of tasks) {
    const sched = scheduleMap.get(task.id)
    if (!sched) continue
    if (viewDay >= sched.startDay && viewDay <= sched.endDay) {
      const arr = dayTasksByMember.get(sched.userId) ?? []
      arr.push({ task, sched })
      dayTasksByMember.set(sched.userId, arr)
    }
  }
  const activeMembers = members.filter((m: ProjectMember) => (dayTasksByMember.get(m.user_id) ?? []).length > 0)

  if (activeMembers.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-4xl mb-4">📭</div>
      <p className="text-slate-600 font-medium">No tasks on this day</p>
      <p className="text-sm text-slate-400 mt-1">
        {scheduleMap.size === 0 ? 'Run optimization first' : 'Try a different day'}
      </p>
    </div>
  )

  return (
    <div className="overflow-auto">
      <div style={{ minWidth: 680 }}>
        {/* Hour ruler */}
        <div className="flex border-b border-slate-200 bg-slate-50 sticky top-0 z-10">
          <div className="shrink-0 border-r border-slate-200" style={{ width: 180 }} />
          <div className="flex flex-1">
            {HOURS.map(h => (
              <div key={h} className={`flex-1 text-center text-[10px] py-1.5 border-r border-slate-200 font-medium ${isToday && Math.floor(currentHour)===h ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400'}`}>
                {h===0?'12am':h<12?`${h}am`:h===12?'12pm':`${h-12}pm`}
              </div>
            ))}
          </div>
        </div>
        {activeMembers.map((member: ProjectMember) => {
          const items = dayTasksByMember.get(member.user_id) ?? []
          const hpd = Number(member.hours_per_day) || 8
          const shiftStart = 9
          return (
            <div key={member.user_id} className="flex border-b border-slate-100 last:border-0">
              <div className="shrink-0 px-4 border-r border-slate-200 flex flex-col justify-center bg-white" style={{ width: 180 }}>
                <p className="text-sm font-medium text-slate-700 truncate">{member.username}</p>
                <p className="text-xs text-slate-400">{member.skills.join(', ') || '—'}</p>
              </div>
              <div className="flex-1 relative">
                <div className="absolute inset-0 flex pointer-events-none">
                  {HOURS.map(h => <div key={h} className={`flex-1 border-r border-slate-100 ${h>=shiftStart && h<shiftStart+hpd?'bg-slate-50/60':''}`} />)}
                </div>
                {isToday && <div className="absolute top-0 bottom-0 w-0.5 bg-indigo-500 z-20 opacity-70" style={{ left: `${(currentHour/24)*100}%` }} />}
                {items.map(({ task, sched }, idx) => {
                  const c = colorMap.get(task.skill?.toLowerCase().trim() ?? '') ?? FALLBACK_COLOR
                  const overdue = task.deadline_days != null && sched.endDay > task.deadline_days
                  const taskStart = shiftStart + (sched.startHour % sched.workerHpd)
                  const taskEnd = taskStart + (sched.endHour - sched.startHour)
                  return (
                    <div key={task.id} className="absolute flex items-center gap-2 px-3 cursor-pointer hover:brightness-110 select-none rounded-md"
                      style={{ left:`${(taskStart/24)*100}%`, width:`${Math.max(((taskEnd-taskStart)/24)*100,2)}%`, top: 4+idx*44, height:36, background:overdue?'#991b1b':c.bg, border:`1px solid ${overdue?'#ef4444':c.border}` }}
                      onClick={() => onTaskClick(task)}>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold truncate" style={{ color:c.text }}>{task.name}</span>
                        <span className="text-[10px] opacity-70 truncate" style={{ color:c.text }}>{task.skill} · {task.duration}h{overdue?' ⚠':''}</span>
                      </div>
                      <div className="ml-auto shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background:'rgba(0,0,0,0.2)', color:c.text }}>P{task.priority}</div>
                    </div>
                  )
                })}
                <div style={{ height: Math.max(64, items.length*44+8) }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Week View ────────────────────────────────────────────────────────────────
function WeekView({ tasks, members, onTaskClick, projectStart, weekStart, scheduleMap, colorMap }: any) {
  const today = new Date(); today.setHours(0,0,0,0)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // For each day, collect tasks active on that project day
  function tasksForDay(date: Date) {
    const projDay = Math.round((date.getTime() - projectStart.getTime()) / 86400000) + 1
    const result: { task: Task; sched: SchedEntry; member: ProjectMember }[] = []
    for (const task of tasks) {
      const sched = scheduleMap.get(task.id)
      if (!sched) continue
      if (projDay >= sched.startDay && projDay <= sched.endDay) {
        const member = members.find((m: ProjectMember) => m.user_id === sched.userId)
        if (member) result.push({ task, sched, member })
      }
    }
    return result
  }

  const weekLabel = `${days[0].getDate()} – ${days[6].getDate()} ${MONTHS[days[6].getMonth()]} ${days[6].getFullYear()}`

  return (
    <div className="overflow-auto">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 sticky top-0 z-10" style={{ minWidth: 700 }}>
        {days.map(day => {
          const isT = sameDay(day, today)
          const past = day < today
          return (
            <div key={day.toISOString()} className={`text-center py-2 border-r border-slate-200 last:border-0 ${isT?'bg-indigo-50':''}`}>
              <p className={`text-[11px] font-medium uppercase tracking-wide ${isT?'text-indigo-600':past?'text-slate-300':'text-slate-500'}`}>{DAYS_SHORT[day.getDay()]}</p>
              <p className={`text-lg font-bold leading-tight ${isT?'text-indigo-600':past?'text-slate-300':'text-slate-700'}`}>{day.getDate()}</p>
              {isT && <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mx-auto mt-0.5" />}
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-7 border-slate-200" style={{ minWidth: 700, minHeight: 300 }}>
        {days.map(day => {
          const dayTasks = tasksForDay(day)
          const isT = sameDay(day, today)
          const past = day < today
          return (
            <div key={day.toISOString()} className={`border-r border-slate-200 last:border-0 p-1.5 min-h-[200px] ${isT?'bg-indigo-50/40':past?'bg-slate-50/60':''}`}>
              {dayTasks.length === 0 && (
                <p className="text-slate-200 text-xs text-center mt-6">—</p>
              )}
              {dayTasks.map(({ task, sched, member }) => {
                const c = colorMap.get(task.skill?.toLowerCase().trim() ?? '') ?? FALLBACK_COLOR
                const overdue = task.deadline_days != null && sched.endDay > task.deadline_days
                return (
                  <div key={task.id} onClick={() => onTaskClick(task)}
                    className="mb-1 rounded px-2 py-1 cursor-pointer hover:brightness-110 transition-all text-[11px]"
                    style={{ background: overdue?'#991b1b':c.bg, border:`1px solid ${overdue?'#ef4444':c.border}` }}>
                    <p className="font-semibold truncate" style={{ color:c.text }}>{task.name}</p>
                    <p className="opacity-70 truncate" style={{ color:c.text }}>{member.username} · {task.duration}h</p>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Month View ───────────────────────────────────────────────────────────────
function MonthView({ tasks, members, onTaskClick, projectStart, monthStart, scheduleMap, colorMap }: any) {
  const today = new Date(); today.setHours(0,0,0,0)
  const year = monthStart.getFullYear()
  const month = monthStart.getMonth()
  const firstDOW = (new Date(year, month, 1).getDay() + 6) % 7 // Monday-based
  const daysInMonth = new Date(year, month+1, 0).getDate()
  const totalCells = Math.ceil((firstDOW + daysInMonth) / 7) * 7
  const cells = Array.from({ length: totalCells }, (_, i) => {
    const d = new Date(year, month, 1 - firstDOW + i)
    return d
  })

  const [hoverDate, setHoverDate] = useState<string | null>(null)

  function tasksForDay(date: Date) {
    const projDay = Math.round((date.getTime() - projectStart.getTime()) / 86400000) + 1
    return tasks.filter((task: Task) => {
      const sched = scheduleMap.get(task.id)
      return sched && projDay >= sched.startDay && projDay <= sched.endDay
    })
  }

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
        {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d => (
          <div key={d} className={`text-center py-2 text-xs font-semibold uppercase tracking-wide ${d==='Сб'||d==='Вс'?'text-red-400':'text-slate-500'}`}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((date, i) => {
          const inMonth = date.getMonth() === month
          const isT = sameDay(date, today)
          const dayTasks = tasksForDay(date)
          const isWknd = date.getDay() === 0 || date.getDay() === 6
          const key = toInputVal(date)

          return (
            <div key={i}
              onMouseEnter={() => setHoverDate(key)}
              onMouseLeave={() => setHoverDate(null)}
              className={`border-b border-r border-slate-100 min-h-[90px] p-1.5 relative transition-colors
                ${!inMonth ? 'bg-slate-50' : isT ? 'bg-indigo-50' : isWknd ? 'bg-red-50/20' : ''}
                ${hoverDate===key&&inMonth ? 'bg-slate-50' : ''}
              `}>
              {/* Day number */}
              <div className={`flex items-center justify-between mb-1`}>
                <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full
                  ${isT ? 'bg-indigo-500 text-white' : !inMonth ? 'text-slate-300' : isWknd ? 'text-red-400' : 'text-slate-700'}
                `}>{date.getDate()}</span>
                {dayTasks.length > 2 && (
                  <span className="text-[10px] text-slate-400 font-medium">{dayTasks.length} tasks</span>
                )}
              </div>

              {/* Task dots / pills */}
              {dayTasks.slice(0, 3).map((task: Task) => {
                const c = colorMap.get(task.skill?.toLowerCase().trim() ?? '') ?? FALLBACK_COLOR
                return (
                  <div key={task.id} onClick={() => onTaskClick(task)}
                    className="mb-0.5 rounded px-1.5 py-0.5 cursor-pointer hover:brightness-110 transition-all"
                    style={{ background: c.bg, border:`1px solid ${c.border}` }}>
                    <p className="text-[10px] font-semibold truncate" style={{ color:c.text }}>{task.name}</p>
                  </div>
                )
              })}
              {dayTasks.length > 3 && (
                <p className="text-[10px] text-slate-400 pl-1">+{dayTasks.length-3} more</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main GanttView ───────────────────────────────────────────────────────────
export default function GanttView({ tasks, members, onTaskClick, startDate, optResult }: Props) {
  const today = new Date(); today.setHours(0,0,0,0)
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week')
  const [viewDate, setViewDate] = useState<Date>(today)

  const projectStart = startDate ? new Date(startDate) : new Date()
  projectStart.setHours(0,0,0,0)

  const colorMap = buildColorMap(tasks)
  const depMap = new Map<string, string[]>()
  for (const task of tasks) if (task.depends_on?.length) depMap.set(task.id, task.depends_on)
  const scheduleMap = getScheduleMap(tasks, members, optResult, depMap)

  const weekStart = startOfWeek(viewDate)
  const monthStart = startOfMonth(viewDate)

  // Navigation
  function prev() {
    if (viewMode === 'day') setViewDate(d => addDays(d, -1))
    else if (viewMode === 'week') setViewDate(d => addDays(d, -7))
    else setViewDate(d => new Date(d.getFullYear(), d.getMonth()-1, 1))
  }
  function next() {
    if (viewMode === 'day') setViewDate(d => addDays(d, 1))
    else if (viewMode === 'week') setViewDate(d => addDays(d, 7))
    else setViewDate(d => new Date(d.getFullYear(), d.getMonth()+1, 1))
  }

  // Header label
  function headerLabel() {
    if (viewMode === 'day') return fmtDay(viewDate)
    if (viewMode === 'week') {
      const ws = startOfWeek(viewDate)
      const we = addDays(ws, 6)
      return `${ws.getDate()} – ${we.getDate()} ${MONTHS[we.getMonth()]} ${we.getFullYear()}`
    }
    return `${MONTHS_RU[viewDate.getMonth()]} ${viewDate.getFullYear()}`
  }

  const schedValues = Array.from(scheduleMap.values())
  const maxDay = schedValues.length > 0 ? Math.max(...schedValues.map(s => s.endDay)) : 0

  // Active skills for legend
  const allSkills = Array.from(new Set(tasks.map(t => t.skill).filter(Boolean) as string[]))

  return (
    <div className="card overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white flex-wrap gap-2">
        {/* View tabs */}
        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
          {(['day','week','month'] as const).map(m => (
            <button key={m} onClick={() => setViewMode(m)}
              className={`px-4 py-1.5 font-medium transition-colors capitalize ${viewMode===m ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
              {m === 'day' ? 'Day' : m === 'week' ? 'Week' : 'Month'}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button onClick={prev} className="btn-secondary px-3 py-1.5 text-sm">←</button>
          <span className="text-sm font-semibold text-slate-700 min-w-[180px] text-center">{headerLabel()}</span>
          <button onClick={next} className="btn-secondary px-3 py-1.5 text-sm">→</button>
        </div>

        {/* Today button + date picker */}
        <div className="flex items-center gap-2">
          <button onClick={() => setViewDate(today)} className="btn-secondary px-3 py-1.5 text-sm">Today</button>
          <input type="date" value={toInputVal(viewDate)}
            onChange={e => { const d = new Date(e.target.value); if (!isNaN(d.getTime())) setViewDate(d) }}
            className="input text-sm" style={{ width: 140 }} />
        </div>
      </div>

      {/* View content */}
      {viewMode === 'day' && (
        <DayView tasks={tasks} members={members} onTaskClick={onTaskClick} projectStart={projectStart} viewDate={viewDate} scheduleMap={scheduleMap} colorMap={colorMap} />
      )}
      {viewMode === 'week' && (
        <WeekView tasks={tasks} members={members} onTaskClick={onTaskClick} projectStart={projectStart} weekStart={weekStart} scheduleMap={scheduleMap} colorMap={colorMap} />
      )}
      {viewMode === 'month' && (
        <MonthView tasks={tasks} members={members} onTaskClick={onTaskClick} projectStart={projectStart} monthStart={monthStart} scheduleMap={scheduleMap} colorMap={colorMap} />
      )}

      {/* Legend */}
      {allSkills.length > 0 && (
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap gap-3 items-center">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Skills</span>
          {allSkills.map(skill => {
            const c = colorMap.get(skill.toLowerCase().trim()) ?? FALLBACK_COLOR
            return (
              <div key={skill} className="flex items-center gap-1.5 text-xs text-slate-500">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background:c.bg, border:`1px solid ${c.border}` }} />
                {skill}
              </div>
            )
          })}
          {maxDay > 0 && <span className="ml-auto text-xs text-slate-400">Project span: {maxDay} days</span>}
        </div>
      )}
    </div>
  )
}