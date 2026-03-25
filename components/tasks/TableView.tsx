'use client'
import { useState } from 'react'
import { Task, ProjectMember } from '@/types'

interface Props {
  tasks: Task[]
  members: ProjectMember[]
  isManager: boolean
  onTaskClick: (task: Task) => void
  onStatusChange: (taskId: string, status: string) => void
}

const PRIORITY_LABELS = ['', 'Low', 'Normal', 'Medium', 'High', 'Critical']

const STATUS_COLORS: Record<string, string> = {
  'To Do':       'bg-slate-100 text-slate-600',
  'Blocked':     'bg-red-100 text-red-600',
  'In Progress': 'bg-blue-100 text-blue-700',
  'Done':        'bg-green-100 text-green-700',
}

export default function TableView({ tasks, members, isManager, onTaskClick, onStatusChange }: Props) {
  const [toast, setToast] = useState<string | null>(null)

  const memberById = Object.fromEntries(members.map(m => [m.user_id, m]))
  const statusById  = Object.fromEntries(tasks.map(t => [t.id, t.status]))

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

  function handleStatusChange(task: Task, newStatus: string) {
    if (newStatus === 'Done') {
      const unfinished = blockedBy(task)
      if (unfinished.length > 0) {
        showToast(`Cannot mark as Done — waiting on: ${unfinished.join(', ')}`)
        return
      }
    }
    onStatusChange(task.id, newStatus)
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <p>No tasks yet{isManager ? ' — click \"+ Task\" to create one' : ''}</p>
      </div>
    )
  }

  return (
    <div className="relative">
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-lg">
           {toast}
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Task</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Skill</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Priority</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Duration</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Deadline</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Assignee</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tasks.map(task => {
              const unfinished = blockedBy(task)
              const isBlocked  = unfinished.length > 0

              return (
                <tr
                  key={task.id}
                  className="hover:bg-slate-50 cursor-pointer"
                  onClick={() => onTaskClick(task)}
                >
                  <td className="px-4 py-3 font-medium text-slate-800 max-w-xs">
                    <div className="flex items-center gap-2">
                      {isBlocked && (
                        <span className="text-red-400 text-xs" title={`Waiting on: ${unfinished.join(', ')}`}></span>
                      )}
                      <span className="truncate block">{task.name}</span>
                    </div>
                    {isBlocked && (
                      <p className="text-xs text-red-400 mt-0.5 truncate">
                        Waiting on: {unfinished.join(', ')}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {task.skill || <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge priority-${task.priority}`}>
                      {PRIORITY_LABELS[task.priority]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{task.duration}h</td>
                  <td className="px-4 py-3 text-slate-500">
                    {task.deadline_days != null ? `Day ${task.deadline_days}` : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {task.assigned_to
                      ? memberById[task.assigned_to]?.username || task.assigned_username || '—'
                      : <span className="text-slate-300">Unassigned</span>
                    }
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <select
                      value={task.status}
                      onChange={e => handleStatusChange(task, e.target.value)}
                      className={`badge cursor-pointer border-0 ${STATUS_COLORS[task.status]} pr-6`}
                      style={{ appearance: 'auto' }}
                    >
                      <option>To Do</option>
                      <option>Blocked</option>
                      <option>In Progress</option>
                      <option>Done</option>
                    </select>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}