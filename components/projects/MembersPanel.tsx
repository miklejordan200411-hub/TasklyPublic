'use client'
import { useRef, useState } from 'react'
import { ProjectMember, Task } from '@/types'

interface Props {
  members: ProjectMember[]
  tasks: Task[]
  isManager: boolean
  projectId: string
  onClose: () => void
  onReload: () => void
}

export default function MembersPanel({ members, tasks, isManager, projectId, onClose, onReload }: Props) {
  const [editing, setEditing] = useState<string | null>(null)
  const [skillsInput, setSkillsInput] = useState('')
  const [hoursInput, setHoursInput] = useState('')

  // CV upload state
  const [cvLoading, setCvLoading] = useState(false)
  const [cvError, setCvError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function startEdit(m: ProjectMember) {
    setEditing(m.user_id)
    setSkillsInput(m.skills.join(', '))
    setHoursInput(m.hours_per_day.toString())
    setCvError(null)
  }

  async function saveEdit(userId: string) {
    await fetch(`/api/projects/${projectId}/members`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        skills: skillsInput.split(',').map(s => s.trim()).filter(Boolean),
        hours_per_day: Number(hoursInput),
      }),
    })
    setEditing(null)
    onReload()
  }

  async function handleCvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setCvLoading(true)
    setCvError(null)

    try {
      const formData = new FormData()
      formData.append('cv', file)

      const res = await fetch(`/api/projects/${projectId}/members/cv`, {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setCvError(data.error ?? 'Something went wrong')
        return
      }

      const extracted: string[] = data.skills ?? []
      if (extracted.length === 0) {
        setCvError('No skills found in the CV')
        return
      }

      // Merge with existing skills, deduplicate
      const existing = skillsInput.split(',').map(s => s.trim()).filter(Boolean)
      const merged = Array.from(new Set([...existing, ...extracted]))
      setSkillsInput(merged.join(', '))
    } catch {
      setCvError('Failed to upload CV')
    } finally {
      setCvLoading(false)
      // Reset so same file can be re-uploaded
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-800">Team Members</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
      </div>

      <div className="space-y-3">
        {members.map(m => {
          const memberTasks = tasks.filter(t => t.assigned_to === m.user_id)
          const totalHours = memberTasks.reduce((s, t) => s + Number(t.duration), 0)
          const doneTasks = memberTasks.filter(t => t.status === 'Done').length
          const available = Number(m.hours_per_day) * 20
          const pct = Math.round((totalHours / available) * 100)

          return (
            <div key={m.user_id} className="card p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-medium text-slate-800 text-sm">{m.username}</p>
                  <span className={`badge text-xs ${m.role === 'manager' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                    {m.role}
                  </span>
                </div>
                {isManager && editing !== m.user_id && (
                  <button onClick={() => startEdit(m)} className="text-xs text-indigo-600 hover:underline">Edit</button>
                )}
              </div>

              {editing === m.user_id ? (
                <div className="space-y-2 mt-2">

                  {/* ── CV Upload ─────────────────────────────── */}
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Auto-detect skills from CV</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={cvLoading}
                        onClick={() => fileInputRef.current?.click()}
                        className="btn-secondary text-xs py-1 flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {cvLoading ? (
                          <>
                            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>
                            Analysing…
                          </>
                        ) : (
                          <>
                            <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" />
                            </svg>
                            Upload CV
                          </>
                        )}
                      </button>
                      <span className="text-xs text-slate-400">PDF or TXT</span>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.txt"
                      className="hidden"
                      onChange={handleCvUpload}
                    />

                    {cvError && (
                      <p className="text-xs text-red-500 mt-1">{cvError}</p>
                    )}
                  </div>

                  {/* ── Skills ────────────────────────────────── */}
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Skills (comma-separated)</label>
                    <input
                      className="input text-xs"
                      value={skillsInput}
                      onChange={e => setSkillsInput(e.target.value)}
                      placeholder="React, Node, Python"
                    />
                  </div>

                  {/* ── Hours ─────────────────────────────────── */}
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Hours per day</label>
                    <input
                      type="number"
                      className="input text-xs"
                      value={hoursInput}
                      onChange={e => setHoursInput(e.target.value)}
                      min="1"
                      max="24"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(m.user_id)} className="btn-primary text-xs py-1">Save</button>
                    <button onClick={() => setEditing(null)} className="btn-secondary text-xs py-1">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="mt-2 space-y-1.5">
                  {m.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {m.skills.map(s => (
                        <span key={s} className="badge bg-indigo-50 text-indigo-600 text-xs">{s}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>{m.hours_per_day}h/day</span>
                    <span>·</span>
                    <span>{memberTasks.length} tasks</span>
                    <span>·</span>
                    <span>{doneTasks} done</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${pct > 100 ? 'bg-red-500' : pct > 75 ? 'bg-orange-400' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <span className={`text-xs ${pct > 100 ? 'text-red-600 font-medium' : 'text-slate-400'}`}>
                      {pct}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}