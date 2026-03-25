'use client'
import { useState, useEffect } from 'react'
import { Task, ProjectMember, Comment, HistoryEntry } from '@/types'

interface Props {
  task: Task | null
  projectId: string
  members: ProjectMember[]
  allTasks: Task[]
  isManager: boolean
  onClose: () => void
  onReload: () => void
}

const PRIORITY_LABELS = ['', 'Low', 'Normal', 'Medium', 'High', 'Critical']

// Returns true if adding newDep → taskId would create a cycle
// i.e. checks if taskId is already reachable FROM newDep
function wouldCreateCycle(
  taskId: string,
  newDepId: string,
  allTasks: Task[],
  currentDeps: string[]
): boolean {
  // Build full dep map including the proposed new edge
  const depMap = new Map<string, string[]>()
  for (const t of allTasks) {
    depMap.set(t.id, [...(t.depends_on ?? [])])
  }
  // Apply current form state for this task
  depMap.set(taskId, [...currentDeps, newDepId])

  // DFS from newDepId — if we can reach taskId, it's a cycle
  const visited = new Set<string>()
  function dfs(id: string): boolean {
    if (id === taskId) return true
    if (visited.has(id)) return false
    visited.add(id)
    for (const dep of (depMap.get(id) ?? [])) {
      if (dfs(dep)) return true
    }
    return false
  }
  return dfs(newDepId)
}

export default function TaskModal({ task, projectId, members, allTasks, isManager, onClose, onReload }: Props) {
  const isNew = !task
  const [form, setForm] = useState({
    name: task?.name || '',
    duration: task?.duration?.toString() || '8',
    skill: task?.skill || '',
    priority: task?.priority?.toString() || '3',
    deadline_days: task?.deadline_days?.toString() || '',
    assigned_to: task?.assigned_to || '',
    status: task?.status || 'To Do',
    depends_on: task?.depends_on || [] as string[],
  })
  const [comments, setComments] = useState<Comment[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [commentText, setCommentText] = useState('')
  const [tab, setTab] = useState<'details' | 'comments' | 'history'>('details')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [cycleError, setCycleError] = useState('')

  useEffect(() => {
    if (task) {
      fetch(`/api/tasks/${task.id}/comments`).then(r => r.json()).then(setComments)
      fetch(`/api/tasks/${task.id}/history`).then(r => r.json()).then(setHistory)
    }
  }, [task])

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const body = {
        name: form.name,
        duration: Number(form.duration),
        skill: form.skill,
        priority: Number(form.priority),
        deadline_days: form.deadline_days ? Number(form.deadline_days) : null,
        assigned_to: form.assigned_to || null,
        status: form.status,
        depends_on: form.depends_on,
      }
      let res
      if (isNew) {
        res = await fetch(`/api/projects/${projectId}/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        res = await fetch(`/api/tasks/${task!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      onReload()
      onClose()
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!task || !confirm('Delete this task?')) return
    await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' })
    onReload()
    onClose()
  }

  async function handleAddComment() {
    if (!task || !commentText.trim()) return
    const res = await fetch(`/api/tasks/${task.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: commentText }),
    })
    if (res.ok) {
      const c = await res.json()
      setComments(cs => [...cs, c])
      setCommentText('')
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!task) return
    await fetch(`/api/tasks/${task.id}/comments?comment_id=${commentId}`, { method: 'DELETE' })
    setComments(cs => cs.filter(c => c.id !== commentId))
  }

  function toggleDep(depId: string) {
    setCycleError('')
    setForm(f => {
      if (f.depends_on.includes(depId)) {
        // Removing — always safe
        return { ...f, depends_on: f.depends_on.filter(id => id !== depId) }
      }
      // Adding — check for cycle
      if (task && wouldCreateCycle(task.id, depId, allTasks, f.depends_on)) {
        setCycleError(`Cannot add "${allTasks.find(t => t.id === depId)?.name}" — it would create a circular dependency.`)
        return f
      }
      return { ...f, depends_on: [...f.depends_on, depId] }
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">{isNew ? 'New Task' : 'Task Details'}</h2>
          <div className="flex gap-2">
            {!isNew && isManager && (
              <button onClick={handleDelete} className="btn-danger text-xs">Delete</button>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
          </div>
        </div>

        {/* Tabs */}
        {!isNew && (
          <div className="flex gap-1 px-6 pt-3">
            {(['details', 'comments', 'history'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${tab === t ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
                {t === 'comments' && comments.length > 0 && (
                  <span className="ml-1 text-xs">{comments.length}</span>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Details tab */}
          {(isNew || tab === 'details') && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  disabled={!isManager && !isNew}
                  placeholder="Task name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Duration (hours) *</label>
                  <input
                    type="number"
                    className="input"
                    value={form.duration}
                    onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                    disabled={!isManager && !isNew}
                    min="0.5"
                    step="0.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Skill required</label>
                  <input
                    className="input"
                    value={form.skill}
                    onChange={e => setForm(f => ({ ...f, skill: e.target.value }))}
                    disabled={!isManager && !isNew}
                    placeholder="e.g. React, Node, Design"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                  <select
                    className="input"
                    value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                    disabled={!isManager && !isNew}
                  >
                    {[1,2,3,4,5].map(p => (
                      <option key={p} value={p}>{p} — {PRIORITY_LABELS[p]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Deadline (day from start)</label>
                  <input
                    type="number"
                    className="input"
                    value={form.deadline_days}
                    onChange={e => setForm(f => ({ ...f, deadline_days: e.target.value }))}
                    disabled={!isManager && !isNew}
                    placeholder="e.g. 14"
                    min="1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Assignee</label>
                  <select
                    className="input"
                    value={form.assigned_to}
                    onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
                    disabled={!isManager}
                  >
                    <option value="">Unassigned</option>
                    {members.map(m => (
                      <option key={m.user_id} value={m.user_id}>{m.username}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select
                    className="input"
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}
                  >
                    <option>To Do</option>
                    <option>In Progress</option>
                    <option>Done</option>
                  </select>
                </div>
              </div>

              {/* Dependencies */}
              {isManager && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Dependencies (this task starts after)
                  </label>
                  {cycleError && (
                    <p className="text-red-600 text-xs mb-2 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
                      ⚠ {cycleError}
                    </p>
                  )}
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {allTasks
                      .filter(t => t.id !== task?.id)
                      .map(t => {
                        const isCyclic = !form.depends_on.includes(t.id) &&
                          task != null &&
                          wouldCreateCycle(task.id, t.id, allTasks, form.depends_on)
                        return (
                          <label
                            key={t.id}
                            className={`flex items-center gap-2 text-sm cursor-pointer px-2 py-1 rounded ${isCyclic ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-50'}`}
                            title={isCyclic ? 'Would create a cycle' : undefined}
                          >
                            <input
                              type="checkbox"
                              checked={form.depends_on.includes(t.id)}
                              onChange={() => !isCyclic && toggleDep(t.id)}
                              disabled={isCyclic}
                              className="rounded"
                            />
                            <span className="text-slate-700">{t.name}</span>
                            {isCyclic && <span className="text-xs text-red-400 ml-auto">cycle</span>}
                          </label>
                        )
                      })}
                  </div>
                </div>
              )}

              {error && <p className="text-red-600 text-sm">{error}</p>}
            </div>
          )}

          {/* Comments tab */}
          {tab === 'comments' && (
            <div className="space-y-3">
              {comments.length === 0 && (
                <p className="text-slate-400 text-sm text-center py-4">No comments yet</p>
              )}
              {comments.map(c => (
                <div key={c.id} className="bg-slate-50 rounded-lg px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm text-slate-700">{c.username}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">
                        {new Date(c.created_at).toLocaleString()}
                      </span>
                      <button
                        onClick={() => handleDeleteComment(c.id)}
                        className="text-slate-300 hover:text-red-500 text-xs"
                      >✕</button>
                    </div>
                  </div>
                  <p className="text-slate-600 text-sm">{c.text}</p>
                </div>
              ))}
              <div className="flex gap-2 mt-4">
                <input
                  className="input flex-1 text-sm"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                />
                <button onClick={handleAddComment} className="btn-primary text-sm">Send</button>
              </div>
            </div>
          )}

          {/* History tab */}
          {tab === 'history' && (
            <div className="space-y-2">
              {history.length === 0 && (
                <p className="text-slate-400 text-sm text-center py-4">No changes yet</p>
              )}
              {history.map(h => (
                <div key={h.id} className="flex items-start gap-3 text-sm border-b border-slate-100 pb-2">
                  <span className="text-slate-400 text-xs mt-0.5 whitespace-nowrap">
                    {new Date(h.changed_at).toLocaleString()}
                  </span>
                  <div>
                    <span className="font-medium text-slate-700">{h.username}</span>
                    <span className="text-slate-500"> changed </span>
                    <span className="font-mono text-xs bg-slate-100 px-1 rounded">{h.field_changed}</span>
                    <span className="text-slate-400"> from </span>
                    <span className="text-red-500 text-xs">{h.old_value || '—'}</span>
                    <span className="text-slate-400"> → </span>
                    <span className="text-green-600 text-xs">{h.new_value || '—'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {(isNew || tab === 'details') && (
          <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            {(isManager || !task) && (
              <button onClick={handleSave} className="btn-primary" disabled={saving}>
                {saving ? 'Saving...' : isNew ? 'Create Task' : 'Save Changes'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}