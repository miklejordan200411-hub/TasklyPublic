'use client'
import { useState } from 'react'
import { Task, ProjectMember } from '@/types'

interface Props {
  tasks: Task[]
  members: ProjectMember[]
  isManager: boolean
  onTaskClick: (task: Task) => void
  onStatusChange: (taskId: string, status: string) => void
  onReload: () => void
}

const COLUMNS = ['To Do', 'Blocked', 'In Progress', 'Done'] as const
type Column = typeof COLUMNS[number]

const COL_STYLES: Record<Column, { bg: string; border: string; badge: string; header: string }> = {
  'To Do':       { bg: 'bg-slate-50',  border: 'border-slate-200', badge: 'bg-slate-100 text-slate-500', header: 'text-slate-600' },
  'Blocked':     { bg: 'bg-red-50',    border: 'border-red-200',   badge: 'bg-red-100 text-red-500',     header: 'text-red-600'   },
  'In Progress': { bg: 'bg-blue-50',   border: 'border-blue-200',  badge: 'bg-blue-100 text-blue-500',   header: 'text-blue-600'  },
  'Done':        { bg: 'bg-green-50',  border: 'border-green-200', badge: 'bg-green-100 text-green-600', header: 'text-green-700' },
}

const PRIORITY_COLORS = ['', 'border-l-slate-300', 'border-l-blue-300', 'border-l-yellow-400', 'border-l-orange-400', 'border-l-red-500']

export default function KanbanView({ tasks, members, isManager, onTaskClick, onStatusChange, onReload }: Props) {
  const [draggedId, setDraggedId]     = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)
  const [saving, setSaving]           = useState<string | null>(null)
  const [toast, setToast]             = useState<string | null>(null)

  const memberById = Object.fromEntries(members.map(m => [m.user_id, m]))
  const statusById = Object.fromEntries(tasks.map(t => [t.id, t.status]))

  function blockedBy(task: Task): string[] {
    if (!task.depends_on || task.depends_on.length === 0) return []
    return task.depends_on
      .filter(depId => statusById[depId] !== 'Done')
      .map(depId => tasks.find(t => t.id === depId)?.name ?? depId)
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  async function handleDrop(targetStatus: Column) {
    if (!draggedId) return
    const task = tasks.find(t => t.id === draggedId)
    setDraggedId(null)
    setDragOverCol(null)
    if (!task) return

    // Block moving to Done if dependencies aren't finished
    if (targetStatus === 'Done') {
      const unfinished = blockedBy(task)
      if (unfinished.length > 0) {
        showToast(`Cannot mark as Done — waiting on: ${unfinished.join(', ')}`)
        return
      }
    }

    const taskId = task.id
    onStatusChange(taskId, targetStatus)
    setSaving(taskId)

    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: targetStatus }),
    })

    setSaving(null)
    if (!res.ok) onReload()
  }

  return (
    <div className="relative">
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-lg">
           {toast}
        </div>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map(col => {
          const colTasks = tasks.filter(t => t.status === col)
          const isOver   = dragOverCol === col
          const styles   = COL_STYLES[col]

          return (
            <div
              key={col}
              className="flex-1 min-w-[260px]"
              onDragOver={e => { e.preventDefault(); setDragOverCol(col) }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={() => handleDrop(col)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {col === 'Blocked' && <span></span>}
                  <h3 className={`font-semibold text-sm ${styles.header}`}>{col}</h3>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles.badge}`}>
                  {colTasks.length}
                </span>
              </div>

              <div className={`min-h-[120px] rounded-xl p-2 border-2 transition-colors ${
                isOver ? 'border-indigo-400 bg-indigo-50' : `border ${styles.border} ${styles.bg}`
              }`}>
                {colTasks.map(task => {
                  const unfinished = blockedBy(task)
                  const isBlocked  = unfinished.length > 0
                  const isDragging = draggedId === task.id

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => setDraggedId(task.id)}
                      onDragEnd={() => { setDraggedId(null); setDragOverCol(null) }}
                      onClick={() => onTaskClick(task)}
                      className={`bg-white rounded-lg p-3 mb-2 last:mb-0 cursor-pointer border-l-4 ${PRIORITY_COLORS[task.priority]} shadow-sm hover:shadow-md transition-all ${
                        isDragging ? 'opacity-40 scale-95' : ''
                      } ${saving === task.id ? 'opacity-60' : ''} ${
                        isBlocked ? 'ring-1 ring-red-300' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="font-medium text-slate-800 text-sm leading-snug">{task.name}</p>
                        {isBlocked && <span className="text-red-400 text-xs shrink-0"></span>}
                      </div>

                      <div className="flex flex-wrap gap-1.5 text-xs">
                        {task.skill && <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600">{task.skill}</span>}
                        <span className="px-1.5 py-0.5 rounded bg-slate-50 text-slate-500">{task.duration}h</span>
                        {task.deadline_days && <span className="px-1.5 py-0.5 rounded bg-orange-50 text-orange-600">Day {task.deadline_days}</span>}
                        {saving === task.id && <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-400">saving…</span>}
                      </div>

                      {isBlocked && (
                        <p className="mt-2 text-xs text-red-400 truncate">
                          Waiting on: {unfinished.join(', ')}
                        </p>
                      )}

                      {task.assigned_to && (
                        <p className="text-xs text-slate-400 mt-2">
                          → {memberById[task.assigned_to]?.username || task.assigned_username}
                        </p>
                      )}
                    </div>
                  )
                })}

                {colTasks.length === 0 && (
                  <div className={`text-center text-sm py-8 ${isOver ? 'text-indigo-400' : 'text-slate-300'}`}>
                    {isOver ? 'Drop here' : 'Empty'}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}