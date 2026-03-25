import Link from 'next/link'
import { getSession } from '@/lib/auth'

export default async function GuidePage() {
  const session = await getSession()

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

        * { font-family: 'Plus Jakarta Sans', sans-serif; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up   { animation: fadeUp .55s ease both; }
        .fade-up-1 { animation: fadeUp .55s .1s ease both; }
        .fade-up-2 { animation: fadeUp .55s .2s ease both; }

        .grid-bg {
          background-image:
            linear-gradient(to right, rgba(79,70,229,.06) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(79,70,229,.06) 1px, transparent 1px);
          background-size: 36px 36px;
        }

        .toc-link {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 12px; border-radius: 10px;
          font-size: 13px; font-weight: 500; color: #64748b;
          text-decoration: none;
          transition: background .15s, color .15s;
        }
        .toc-link:hover { background: #eef2ff; color: #4f46e5; }
        .toc-num {
          font-size: 10px; font-weight: 700; color: #a5b4fc;
          width: 20px; text-align: right; flex-shrink: 0;
          font-variant-numeric: tabular-nums;
        }

        .section-title {
          font-size: 22px; font-weight: 800; color: #0f172a;
          margin-bottom: 20px; display: flex; align-items: center; gap: 12px;
        }
        .section-title-num {
          display: inline-flex; align-items: center; justify-content: center;
          width: 32px; height: 32px; border-radius: 10px;
          background: #eef2ff; color: #4f46e5;
          font-size: 13px; font-weight: 800; flex-shrink: 0;
        }

        .step-row {
          display: flex; gap: 16px; align-items: flex-start;
          padding: 16px; border-radius: 14px;
          border: 1.5px solid #e2e8f0; background: #fff;
          transition: box-shadow .2s, border-color .2s;
        }
        .step-row:hover {
          box-shadow: 0 6px 24px rgba(79,70,229,.09);
          border-color: rgba(79,70,229,.25);
        }

        .role-card {
          border-radius: 16px; border: 1.5px solid #e2e8f0;
          background: #fff; padding: 24px;
          transition: box-shadow .2s, border-color .2s;
        }
        .role-card:hover {
          box-shadow: 0 8px 32px rgba(79,70,229,.1);
          border-color: rgba(79,70,229,.3);
        }

        .tag {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 11px; font-weight: 700; letter-spacing: .07em;
          text-transform: uppercase; padding: 4px 12px; border-radius: 100px;
        }

        .pill-badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 3px 10px 3px 6px; border-radius: 100px;
          font-size: 11px; font-weight: 600;
        }
        .pill-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

        .data-table { width: 100%; border-radius: 14px; overflow: hidden; border: 1.5px solid #e2e8f0; }
        .data-table thead { background: #f8fafc; }
        .data-table th { padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: .07em; }
        .data-table td { padding: 11px 16px; font-size: 13.5px; border-top: 1px solid #f1f5f9; }
        .data-table tr:hover td { background: #fafbff; }

        .view-card {
          display: flex; gap: 16px; align-items: flex-start;
          padding: 20px; border-radius: 14px;
          border: 1.5px solid #e2e8f0; background: #fff;
          transition: box-shadow .2s, border-color .2s;
        }
        .view-card:hover {
          box-shadow: 0 6px 24px rgba(79,70,229,.09);
          border-color: rgba(79,70,229,.25);
        }

        .note-box { border-radius: 12px; padding: 14px 16px; font-size: 13px; line-height: 1.6; }

        .sticky-toc { position: sticky; top: 88px; }
        section[id] { scroll-margin-top: 88px; }

        @media (max-width: 1023px) {
          .sticky-toc { position: static; }
          .layout-grid { display: block !important; }
        }
      `}</style>

      <div className="min-h-screen bg-slate-50">

        {/* Header */}
        <header className="bg-white/80 backdrop-blur border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
          <Link href="/" className="text-xl font-extrabold text-indigo-600 tracking-tight">Taskly</Link>
          <div className="flex gap-3">
            {session ? (
              <Link href="/projects" className="btn-primary">My projects →</Link>
            ) : (
              <>
                <Link href="/login" className="btn-secondary">Login</Link>
                <Link href="/register" className="btn-primary">Get started →</Link>
              </>
            )}
          </div>
        </header>

        {/* Hero */}
        <div className="relative overflow-hidden border-b border-slate-200 bg-white">
          <div className="grid-bg absolute inset-0 pointer-events-none" />
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(99,102,241,.08) 0%, transparent 65%)', transform: 'translate(30%, -30%)' }} />
          <div className="relative max-w-3xl mx-auto px-6 py-16">
            <div className="fade-up">
              <div className="tag bg-indigo-50 text-indigo-600 mb-5">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M5 1L6.2 3.8H9L6.8 5.6L7.6 8.5L5 6.7L2.4 8.5L3.2 5.6L1 3.8H3.8L5 1Z" fill="currentColor"/>
                </svg>
                Documentation
              </div>
            </div>
            <h1 className="fade-up-1 text-5xl font-extrabold text-slate-900 mb-4 tracking-tight leading-tight">
              How to use<br /><span style={{ color: '#4f46e5' }}>Taskly</span>
            </h1>
            <p className="fade-up-2 text-slate-500 text-lg font-light max-w-lg">
              Everything you need to know to get started — from registration to a ready optimized plan
            </p>
          </div>
        </div>

        <main className="max-w-6xl mx-auto px-6 py-14">
          <div className="layout-grid" style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '48px', alignItems: 'start' }}>

            {/* Sidebar TOC */}
            <aside className="sticky-toc">
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-3">Contents</p>
                <nav className="space-y-0.5">
                  {[
                    [1, 'Quick start',      '#start'],
                    [2, 'Roles',            '#roles'],
                    [3, 'Projects & codes', '#projects'],
                    [4, 'Tasks',            '#tasks'],
                    [5, 'Optimization',     '#optimize'],
                    [6, 'Plan views',       '#views'],
                  ].map(([num, label, href]) => (
                    <a key={href as string} href={href as string} className="toc-link">
                      <span className="toc-num">{String(num).padStart(2,'0')}</span>
                      {label}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Content */}
            <div className="space-y-16 min-w-0">

              {/* 1 — Quick start */}
              <section id="start">
                <div className="section-title">
                  <span className="section-title-num">1</span>
                  Quick start
                </div>
                <div className="space-y-3">
                  {[
                    { title: 'Register',        desc: 'Go to /register, enter your username, email and password. Takes 30 seconds.' },
                    { title: 'Create a project', desc: 'On the projects page click "+ New Project", enter a name. You automatically become the manager.' },
                    { title: 'Invite your team', desc: 'Copy the invite code from the project card and send it to colleagues. They enter it in the "Join by code" field.' },
                    { title: 'Add tasks',        desc: 'Open the project, click "+ Task". Fill in the name, duration in hours, required skill, priority and deadline.' },
                    { title: 'Run optimization', desc: 'Click "Optimize". The algorithm will distribute all tasks across the team in seconds.' },
                  ].map((s, i) => (
                    <div key={i} className="step-row">
                      <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                        style={{ background: `rgba(79,70,229,${0.5 + i * 0.1})` }}>
                        {i + 1}
                      </div>
                      <div>
                        <h3 className="text-sm text-slate-800 mb-1" style={{ fontWeight: 700 }}>{s.title}</h3>
                        <p className="text-sm text-slate-500 leading-relaxed font-light">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* 2 — Roles */}
              <section id="roles">
                <div className="section-title">
                  <span className="section-title-num">2</span>
                  Roles
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="role-card" style={{ borderColor: 'rgba(79,70,229,.25)' }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: '#eef2ff' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="1.6">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                      </svg>
                    </div>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="font-bold text-slate-900">Manager</span>
                      <span className="pill-badge bg-indigo-50 text-indigo-600">
                        <span className="pill-dot" style={{ background: '#818cf8' }}/>manager
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {['Creates a project','Adds/edits tasks','Runs optimization','Assigns members','Deletes project'].map(t => (
                        <li key={t} className="flex gap-2.5 text-sm text-slate-600">
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 mt-0.5">
                            <path d="M2.5 7L5.5 10L11.5 4" stroke="#4f46e5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="role-card">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-slate-100">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.6">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                      </svg>
                    </div>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="font-bold text-slate-900">Worker</span>
                      <span className="pill-badge bg-slate-100 text-slate-500">
                        <span className="pill-dot bg-slate-400"/>worker
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {['Joins by code','Views their tasks','Updates task status','Writes comments','Sets their skills'].map(t => (
                        <li key={t} className="flex gap-2.5 text-sm text-slate-600">
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 mt-0.5">
                            <path d="M2.5 7L5.5 10L11.5 4" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>

              {/* 3 — Projects */}
              <section id="projects">
                <div className="section-title">
                  <span className="section-title-num">3</span>
                  Projects & invite codes
                </div>
                <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
                  <p>Each project is a separate team. When creating a project, a unique invite code is generated — for example:</p>
                  <div className="flex items-center gap-3">
                    <code className="bg-slate-900 text-indigo-300 px-4 py-2 rounded-xl font-mono text-base tracking-widest select-all">XK9T-Y2MB</code>
                    <span className="text-slate-400 text-xs">← share this with your team</span>
                  </div>
                  <p>To invite a colleague: copy the code from the project card and send it. The colleague clicks "Join by code" and enters the code.</p>
                  <p>Member skills are set comma-separated in the Members panel. For example:</p>
                  <code className="block bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl font-mono text-sm">React, TypeScript, Node</code>

                  <div className="note-box" style={{ background: '#fffbeb', border: '1.5px solid #fde68a' }}>
                    <div className="flex gap-2.5 items-start">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" className="shrink-0 mt-0.5">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                      <div>
                        <p className="font-semibold text-amber-700 mb-0.5 text-xs uppercase tracking-wide">Important</p>
                        <p className="text-amber-600 text-xs">Skills must be set BEFORE running optimization — otherwise the algorithm cannot distribute tasks correctly.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* 4 — Tasks */}
              <section id="tasks">
                <div className="section-title">
                  <span className="section-title-num">4</span>
                  Tasks
                </div>
                <p className="text-sm text-slate-500 mb-4 font-light">When creating a task the following fields are available:</p>
                <table className="data-table">
                  <thead>
                    <tr><th>Field</th><th>Description</th></tr>
                  </thead>
                  <tbody>
                    {[
                      ['Name',         'What needs to be done'],
                      ['Duration',     'How many hours the task will take'],
                      ['Skill',        'What skill the assignee needs (e.g. React)'],
                      ['Priority',     '1 (low) — 5 (critical). Affects the planning order'],
                      ['Deadline',     'Day from project start by which the task must be done'],
                      ['Dependencies', 'Tasks that must be completed before this one starts'],
                      ['Status',       'To Do / In Progress / Done'],
                    ].map(([f, d]) => (
                      <tr key={f as string}>
                        <td style={{ fontWeight: 600, color: '#334155', width: '36%' }}>{f}</td>
                        <td style={{ color: '#64748b' }}>{d}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              {/* 5 — Optimization */}
              <section id="optimize">
                <div className="section-title">
                  <span className="section-title-num">5</span>
                  Optimization
                </div>
                <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
                  <p>The <span className="inline-flex items-center gap-1.5 bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-lg font-semibold text-xs">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Optimize
                  </span> button is available to managers only. After clicking, the algorithm:</p>

                  <div className="space-y-2">
                    {[
                      'Takes all project tasks',
                      'Takes all members with their skills and hours per day',
                      'Respects task dependencies — no task starts before its predecessors finish',
                      'Assigns tasks to members and saves to the database',
                      'Shows the result: score, number of assigned tasks, and warnings',
                    ].map((s, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <span className="shrink-0 w-5 h-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center mt-0.5"
                          style={{ background: '#4f46e5' }}>{i+1}</span>
                        <span className="text-slate-600">{s}</span>
                      </div>
                    ))}
                  </div>

                  <div className="note-box" style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe' }}>
                    <div className="flex gap-2.5 items-start">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" className="shrink-0 mt-0.5">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                      <div>
                        <p className="font-semibold text-blue-700 mb-0.5 text-xs uppercase tracking-wide">Tip</p>
                        <p className="text-blue-600 text-xs">After optimization you can manually reassign any task — just open it and change the assignee. This does not cancel other assignments.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* 6 — Views */}
              <section id="views">
                <div className="section-title">
                  <span className="section-title-num">6</span>
                  Plan views
                </div>
                <div className="space-y-3">
                  {[
                    {
                      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>,
                      color: '#4f46e5', bg: '#eef2ff',
                      title: 'Table',
                      desc: 'All tasks in a table. Filters by status, assignee, priority, and search by name. Status can be changed directly in the table.',
                    },
                    {
                      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="18" rx="1"/><rect x="17" y="3" width="4" height="18" rx="1"/></svg>,
                      color: '#0891b2', bg: '#ecfeff',
                      title: 'Kanban',
                      desc: 'Three columns: To Do, In Progress, Done. Tasks can be dragged between columns. Left border color = task priority.',
                    },
                    {
                      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M7 14h2M7 18h5M13 14h4"/></svg>,
                      color: '#7c3aed', bg: '#f5f3ff',
                      title: 'Gantt chart',
                      desc: 'A day-by-day timeline showing who works on what. Tasks are sorted by their scheduled start time. Red bar = task is overdue. Dependency arrows connect related tasks.',
                    },
                  ].map((v) => (
                    <div key={v.title} className="view-card">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: v.bg, color: v.color }}>
                        {v.icon}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 mb-1 text-sm">{v.title}</h3>
                        <p className="text-sm text-slate-500 leading-relaxed font-light">{v.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* CTA */}
              <div className="rounded-2xl p-10 text-center relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)', border: '1.5px solid #c7d2fe' }}>
                <div className="absolute inset-0 pointer-events-none grid-bg opacity-50" />
                <div className="relative">
                  <div className="tag bg-white text-indigo-600 mb-5 mx-auto w-fit" style={{ border: '1.5px solid #c7d2fe' }}>
                    Free to start
                  </div>
                  <h2 className="text-2xl font-extrabold text-slate-900 mb-2 tracking-tight">Ready to start?</h2>
                  <p className="text-slate-500 text-sm mb-8 font-light">Create a project and try optimization right now</p>
                  <div className="flex gap-3 justify-center flex-wrap">
                    {session ? (
                      <Link href="/projects" className="btn-primary px-8 py-2.5">My projects →</Link>
                    ) : (
                      <>
                        <Link href="/register" className="btn-primary px-8 py-2.5">Sign up →</Link>
                        <Link href="/login" className="btn-secondary px-8 py-2.5">Login</Link>
                      </>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </main>

        <footer className="border-t border-slate-200 bg-white px-6 py-6 flex items-center justify-between flex-wrap gap-4 mt-8">
          <Link href="/" className="text-lg font-extrabold text-indigo-600 tracking-tight">Taskly</Link>
          <div className="flex gap-4">
            <Link href="/" className="text-sm text-slate-400 hover:text-slate-600">Home</Link>
            {!session && <Link href="/login" className="text-sm text-slate-400 hover:text-slate-600">Login</Link>}
          </div>
        </footer>

      </div>
    </>
  )
}