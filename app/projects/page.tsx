'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

interface Project {
  id: string
  name: string
  invite_code: string
  created_at: string
  role: string
}

export default function ProjectsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [createName, setCreateName] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  
  useEffect(() => { loadProjects() }, [])

  useEffect(() => {
    if (searchParams.get('create') === '1') { setShowCreate(true); setShowJoin(false) }
    if (searchParams.get('join') === '1') { setShowJoin(true); setShowCreate(false) }
  }, [searchParams])

  async function loadProjects() {
    const res = await fetch('/api/projects')
    if (res.ok) setProjects(await res.json())
    setLoading(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: createName, start_date: startDate }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); return }
    setShowCreate(false)
    setCreateName('')
    setStartDate(new Date().toISOString().split('T')[0])
    loadProjects()
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const res = await fetch('/api/projects/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invite_code: joinCode }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); return }
    setShowJoin(false)
    setJoinCode('')
    loadProjects()
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xl font-bold text-indigo-600 hover:text-indigo-700 transition-colors">Taskly</Link>
          <Link href="/" className="text-sm text-slate-400 hover:text-slate-600 transition-colors">← Home</Link>
        </div>
        <div className="flex gap-3">
          <button onClick={() => { setShowJoin(true); setShowCreate(false); setError('') }} className="btn-secondary">
            Join by code
          </button>
          <button onClick={() => { setShowCreate(true); setShowJoin(false); setError('') }} className="btn-primary">
            + New Project
          </button>
          <button onClick={handleLogout} className="btn-secondary text-slate-500">
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-semibold text-slate-800 mb-6">My Projects</h2>

        {/* Create form */}
        {showCreate && (
          <div className="card p-5 mb-6">
            <h3 className="font-medium text-slate-700 mb-3">New Project</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="flex gap-3">
                <input
                  className="input flex-1"
                  value={createName}
                  onChange={e => setCreateName(e.target.value)}
                  placeholder="Project name"
                  required
                />
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-500">Start date</label>
                  <input
                    type="date"
                    className="input"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary">Create</button>
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
            {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
          </div>
        )}

        {/* Join form */}
        {showJoin && (
          <div className="card p-5 mb-6">
            <h3 className="font-medium text-slate-700 mb-3">Join Project</h3>
            <form onSubmit={handleJoin} className="flex gap-3">
              <input
                className="input flex-1"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value)}
                placeholder="Invite code (e.g. XK9T-Y2MB)"
                required
              />
              <button type="submit" className="btn-primary">Join</button>
              <button type="button" onClick={() => setShowJoin(false)} className="btn-secondary">Cancel</button>
            </form>
            {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
          </div>
        )}

        {loading ? (
          <div className="text-slate-400 text-center py-12">Loading...</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-lg mb-2">No projects yet</p>
            <p className="text-sm">Create a new project or join one with an invite code</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {projects.map(p => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="card p-5 hover:shadow-md transition-shadow block"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-800">{p.name}</h3>
                    <p className="text-xs text-slate-400 mt-1 font-mono">{p.invite_code}</p>
                  </div>
                  <span className={`badge ${p.role === 'manager' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                    {p.role}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-3">
                  {new Date(p.created_at).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}