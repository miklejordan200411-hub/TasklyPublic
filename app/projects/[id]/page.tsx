'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Task, ProjectMember, OptimizationResult } from '@/types'
import KanbanView from '@/components/kanban/KanbanView'
import GanttView from '@/components/gantt/GanttView'
import TableView from '@/components/tasks/TableView'
import TaskModal from '@/components/tasks/TaskModal'
import MembersPanel from '@/components/projects/MembersPanel'
type ViewMode = 'table' | 'kanban' | 'gantt'

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [project, setProject] = useState<any>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [view, setView] = useState<ViewMode>('table')
  const [showMembers, setShowMembers] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [optimizing, setOptimizing] = useState(false)
  const [optResult, setOptResult] = useState<OptimizationResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [loggedInUserId, setLoggedInUserId] = useState<string | null>(null)

  useEffect(() => {
    setLoggedInUserId(localStorage.getItem('loggedInUserId'))
  }, [])

  // Filters
  const [filterStatus, setFilterStatus] = useState('')
  const [filterAssigned, setFilterAssigned] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [search, setSearch] = useState('')

  const loadData = useCallback(async () => {
    const [projRes, tasksRes, membersRes] = await Promise.all([
      fetch(`/api/projects/${id}`),
      fetch(`/api/projects/${id}/tasks`),
      fetch(`/api/projects/${id}/members`),
    ])
    if (projRes.status === 404) { router.push('/projects'); return }
    setProject(await projRes.json())
    setTasks(await tasksRes.json())
    setMembers(await membersRes.json())
    setLoading(false)
  }, [id, router])

  useEffect(() => {
    if (optResult) {
      console.log('OPT RESULT:', JSON.stringify(optResult.schedule, null, 2))
    }
  }, [optResult])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => {
      const interval = setInterval(() => { loadData() }, 5000)
      return () => clearInterval(interval)
  }, [loadData])
  const isManager = project?.role === 'manager'

  const filteredTasks = tasks.filter(t => {
    if (filterStatus && t.status !== filterStatus) return false
    if (filterAssigned && t.assigned_to !== filterAssigned) return false
    if (filterPriority && t.priority !== Number(filterPriority)) return false
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  async function handleOptimize() {
    setOptimizing(true)
    setOptResult(null)
    const res = await fetch(`/api/projects/${id}/optimize`, { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      setOptResult(data)
      await loadData()
    }
    setOptimizing(false)
  }

  async function handleStatusChange(taskId: string, status: string) {
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setTasks(ts => ts.map(t => t.id === taskId ? { ...t, status: status as any } : t))
  }

  async function handleDeleteProject() {
    if (!confirm('Delete this project?')) return
    await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    router.push('/projects')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-slate-400">Loading...</div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/projects" className="text-slate-400 hover:text-slate-600 text-sm">← Projects</Link>
            <span className="text-slate-300">/</span>
            <h1 className="font-semibold text-slate-800">{project?.name}</h1>
            <span className={`badge ${isManager ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
              {project?.role}
            </span>
            {project?.invite_code && (
              <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded">
                {project.invite_code}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            
            <button onClick={() => setShowMembers(v => !v)} className="btn-secondary text-sm">
               Members ({members.length})
            </button>
            {isManager && (
              <>
                <button
                  onClick={handleOptimize}
                  disabled={optimizing}
                  className="btn-primary text-sm"
                >
                  {optimizing ? ' Optimizing...' : ' Optimize'}
                </button>
                <button onClick={() => setShowCreateTask(true)} className="btn-primary text-sm">
                  + Task
                </button>
                <button onClick={handleDeleteProject} className="btn-danger text-sm">Delete</button>
              </>
            )}
          </div>
        </div>

        {/* View tabs */}
        <div className="flex gap-1 mt-4">
          {(['table', 'kanban', 'gantt'] as ViewMode[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                view === v
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 mt-3 flex-wrap">
          <input
            className="input w-48 text-sm"
            placeholder="Search tasks..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="input w-36 text-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option>To Do</option>
            <option>In Progress</option>
            <option>Done</option>
          </select>
          <select className="input w-36 text-sm" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
            <option value="">All priorities</option>
            {[1,2,3,4,5].map(p => <option key={p} value={p}>Priority {p}</option>)}
          </select>
          <select className="input w-44 text-sm" value={filterAssigned} onChange={e => setFilterAssigned(e.target.value)}>
            <option value="">All assignees</option>
            {members.map(m => <option key={m.user_id} value={m.user_id}>{m.username}</option>)}
          </select>
        </div>
      </header>

      {/* Optimization result banner */}
      {optResult && (
        <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-indigo-800">
              <strong>Optimization complete!</strong> Score: {optResult.score} · {optResult.assignments.length} tasks assigned
              {optResult.warnings.length > 0 && (
                <span className="text-orange-600 ml-3">⚠️ {optResult.warnings.length} warning(s)</span>
              )}
            </div>
            <button onClick={() => setOptResult(null)} className="text-indigo-400 hover:text-indigo-600 text-sm">✕</button>
          </div>
          {optResult.warnings.length > 0 && (
            <ul className="mt-1 text-xs text-orange-600 list-disc list-inside">
              {optResult.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          )}
        </div>
      )}

      <div className="flex">
        {/* Main content */}
        <main className="flex-1 p-6 min-w-0">
          {view === 'table' && (
            <TableView
              tasks={filteredTasks}
              members={members}
              isManager={isManager}
              onTaskClick={setSelectedTask}
              onStatusChange={handleStatusChange}
            />
          )}
          {view === 'kanban' && (
            <KanbanView
              tasks={filteredTasks}
              members={members}
              isManager={isManager}
              onTaskClick={setSelectedTask}
              onStatusChange={handleStatusChange}
              onReload={loadData}
            />
          )}
          {view === 'gantt' && (
            <GanttView
              tasks={filteredTasks}
              members={members}
              onTaskClick={setSelectedTask}
              startDate={project?.start_date}
              optResult={optResult}
            />
          )}
        </main>

        {/* Members panel */}
        {showMembers && (
          <aside className="w-80 border-l border-slate-200 bg-white p-4 shrink-0">
            <MembersPanel
              members={members}
              tasks={tasks}
              isManager={isManager}
              onClose={() => setShowMembers(false)}
              onReload={loadData}
              projectId={id}
            />
          </aside>
        )}
      </div>

      {/* Task modal */}
      {(selectedTask || showCreateTask) && (
        <TaskModal
          task={selectedTask}
          projectId={id}
          members={members}
          allTasks={tasks}
          isManager={isManager}
          onClose={() => { setSelectedTask(null); setShowCreateTask(false) }}
          onReload={loadData}
        />
      )}
    </div>
  )
}