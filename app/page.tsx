import { getSession } from '@/lib/auth'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'

export default async function Home() {
  const session = await getSession()
  return (
    <>

      <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

        {/* ─── HEADER ─── */}
        <header className="bg-white/80 backdrop-blur border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
          <span className="syne text-xl font-bold text-indigo-600 tracking-tight">Taskly</span>
         
          <div className="flex gap-3">
            {session ? (
              <>
                <Link href="/projects" className="btn-primary">My projects →</Link>
                <LogoutButton />
              </>
            ) : (
              <>
                <Link href="/login" className="btn-secondary">Login</Link>
                <Link href="/register" className="btn-primary">Get started →</Link>
              </>
            )}
          </div>
        </header>

        <main>

          {/* ─── HERO ─── */}
          <section className="relative overflow-hidden">
            <div className="grid-bg absolute inset-0 pointer-events-none" />
            <div className="float absolute top-12 right-20 w-72 h-72 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(99,102,241,.12) 0%, transparent 70%)' }} />
            <div className="float-2 absolute bottom-20 left-12 w-56 h-56 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(79,70,229,.08) 0%, transparent 70%)' }} />

            <div className="relative max-w-5xl mx-auto px-6 py-28 text-center">

              {session ? (
                <div className="hero-title inline-flex items-center gap-2 mb-6">
                  <span className="accent-dot" />
                  <span className="tag bg-indigo-50 text-indigo-600">Welcome back, {session.username}</span>
                </div>
              ) : (
                <div className="hero-title inline-flex items-center gap-2 mb-6">
                  <div className="tag bg-indigo-50 text-indigo-600">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M6 1L7.5 4.5H11L8.25 6.75L9.25 10.5L6 8.25L2.75 10.5L3.75 6.75L1 4.5H4.5L6 1Z" fill="currentColor"/>
                    </svg>
                    Smart task distribution
                  </div>
                </div>
              )}

              <h1 className="hero-title syne text-6xl font-extrabold text-slate-900 mb-6 leading-[1.05] tracking-tight">
                Stop manually<br />
                <span style={{ color: 'var(--indigo)' }}>planning tasks</span>
              </h1>

              <p className="hero-sub text-slate-500 text-xl max-w-2xl mx-auto mb-4 leading-relaxed font-light">
                Taskly uses a genetic algorithm to automatically distribute tasks across your team —
                considering skills, deadlines, priorities, and workload.
              </p>
              <p className="hero-sub text-slate-400 text-base max-w-xl mx-auto mb-10 font-light">
                The manager adds tasks, clicks "Optimize" — and gets a ready plan in seconds.
                No meetings, no spreadsheets, no manual matching.
              </p>

              <div className="hero-cta flex gap-3 justify-center flex-wrap mb-20">
                {session ? (
                  <>
                    <Link href="/projects" className="btn-primary text-base px-8 py-3">Open projects →</Link>
                    <Link href="/guide" className="btn-secondary text-base px-8 py-3">Guide</Link>
                  </>
                ) : (
                  <>
                    <Link href="/register" className="btn-primary text-base px-8 py-3">Start for free →</Link>
                    <Link href="/guide" className="btn-secondary text-base px-8 py-3">Guide</Link>
                  </>
                )}
              </div>

              {/* Mock kanban */}
              <div className="hero-mock card overflow-hidden shadow-xl relative corner-bracket">
                <div className="bg-slate-100 px-4 py-3 flex items-center gap-2 border-b border-slate-200">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  <span className="ml-3 text-xs text-slate-400 font-mono">taskly — Backend Team Q4</span>
                  <span className="ml-auto text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: 'rgba(79,70,229,.1)', color: 'var(--indigo)' }}>
                    Optimized · Score: 1240
                  </span>
                </div>
                <div className="p-6 grid grid-cols-3 gap-4">
                  {[
                    { label: 'To Do',       accent: '#94a3b8', bg: '#f8fafc', tasks: ['CI/CD Setup','Write tests','API Docs'] },
                    { label: 'In Progress', accent: '#6366f1', bg: '#eef2ff', tasks: ['Auth API','Database','Deploy to prod'] },
                    { label: 'Done',        accent: '#22c55e', bg: '#f0fdf4', tasks: ['UI Prototype','Spec approved','Design mockup'] },
                  ].map(col => (
                    <div key={col.label} className="rounded-xl p-4 border border-slate-100" style={{ background: col.bg }}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-slate-600 syne tracking-wide uppercase">{col.label}</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white text-slate-500 border border-slate-200">{col.tasks.length}</span>
                      </div>
                      {col.tasks.map((t, i) => (
                        <div key={i} className="h-9 bg-white rounded-lg mb-2 border border-slate-200 flex items-center px-3 gap-2"
                          style={{ borderLeft: `3px solid ${col.accent}` }}>
                          <span className="text-xs text-slate-600 truncate font-medium">{t}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </section>

          {/* ─── PROBLEM / SOLUTION ─── */}
          <section className="bg-white border-y border-slate-200 py-20">
            <div className="max-w-5xl mx-auto px-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
                <div className="relative">
                  <div className="diagonal-line" style={{ height: '100%', top: 0, left: -24 }} />
                  <div className="tag bg-red-50 text-red-500 mb-5">Without Taskly</div>
                  <h2 className="syne text-2xl font-bold text-slate-900 mb-6">Planning takes hours</h2>
                  <ul className="space-y-3.5">
                    {[
                      'Manager manually picks who does what',
                      'Someone is overloaded, someone has nothing to do',
                      'Deadlines are missed due to dependencies',
                      'Constant meetings about task distribution',
                      'Excel sheets that go stale immediately',
                    ].map((t, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-slate-500">
                        <span className="shrink-0 mt-1 w-4 h-4 rounded border border-red-200 bg-red-50 flex items-center justify-center">
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                            <path d="M1.5 1.5L6.5 6.5M6.5 1.5L1.5 6.5" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                        </span>
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="relative">
                  <div className="tag bg-green-50 text-green-600 mb-5">With Taskly</div>
                  <h2 className="syne text-2xl font-bold text-slate-900 mb-6">Algorithm handles everything in seconds</h2>
                  <ul className="space-y-3.5">
                    {[
                      'Automatic distribution by skills',
                      'Balanced workload across the whole team',
                      'Dependencies are hard constraints — never violated',
                      'Optimal plan without meetings',
                      'Three views: table, Kanban, Gantt',
                    ].map((t, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                        <span className="shrink-0 mt-1 w-4 h-4 rounded border border-green-200 bg-green-50 flex items-center justify-center">
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                            <path d="M1.5 4L3.2 5.8L6.5 2" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </span>
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* ─── FEATURES ─── */}
          <section id="features" className="py-24">
            <div className="max-w-5xl mx-auto px-6">
              <div className="mb-14">
                <div className="tag bg-indigo-50 text-indigo-600 mb-4">Features</div>
                <h2 className="syne text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">Everything your team needs</h2>
                <p className="text-slate-500 text-lg font-light">From task creation to a ready plan in a few clicks</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  {
                    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 3C7.03 3 3 7.03 3 12s4.03 9 9 9 9-4.03 9-9" strokeLinecap="round"/><path d="M16 12l3-9 3 3-9 3" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="2"/></svg>,
                    title: 'Genetic algorithm',
                    desc: '80 individuals × 60 generations. Finds the optimal distribution considering all constraints simultaneously.'
                  },
                  {
                    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M12 5v2M12 17v2M5 12H7M17 12h2M7.05 7.05l1.41 1.41M15.54 15.54l1.41 1.41M7.05 16.95l1.41-1.41M15.54 8.46l1.41-1.41"/></svg>,
                    title: 'Skill matching',
                    desc: 'Each member sets their skills. The algorithm rewards exact matches and heavily penalizes mismatches.'
                  },
                  {
                    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
                    title: 'Three plan views',
                    desc: 'Table with filters, Kanban with drag & drop, Gantt chart with a day-by-day timeline.'
                  },
                  {
                    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
                    title: 'Priorities & deadlines',
                    desc: 'Critical tasks (priority 5) always come first. Each day past the deadline costs −50 points.'
                  },
                  {
                    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
                    title: 'Task dependencies',
                    desc: 'Mark that task B depends on task A — the algorithm guarantees B never starts before A finishes.'
                  },
                  {
                    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>,
                    title: 'Workload balance',
                    desc: 'See who is loaded at 120% and who at 30%. The algorithm rewards even distribution across the team.'
                  },
                  {
                    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
                    title: 'Comments',
                    desc: 'The team leaves comments on tasks. All task communication in one place.'
                  },
                  {
                    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
                    title: 'Change history',
                    desc: 'Automatic log of every task change — who, what, and when.'
                  },
                  {
                    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M15 7h3a5 5 0 0 1 5 5 5 5 0 0 1-5 5h-3m-6 0H6a5 5 0 0 1-5-5 5 5 0 0 1 5-5h3"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
                    title: 'Invite codes',
                    desc: "Invite your team with one code. Manager creates a project and shares the code — that's it."
                  },
                ].map((f, i) => (
                  <div key={i} className="feature-card bg-white rounded-2xl p-6">
                    <div className="w-10 h-10 rounded-xl mb-5 flex items-center justify-center"
                      style={{ background: 'var(--indigo-light)', color: 'var(--indigo)' }}>
                      <div style={{ width: 20, height: 20 }}>{f.icon}</div>
                    </div>
                    <h3 className="syne font-semibold text-slate-900 mb-2 text-[15px]">{f.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed font-light">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ─── HOW IT WORKS ─── */}
          <section id="how" className="bg-white border-y border-slate-200 py-24">
            <div className="max-w-4xl mx-auto px-6">
              <div className="mb-14">
                <div className="tag bg-indigo-50 text-indigo-600 mb-4">Process</div>
                <h2 className="syne text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">How it works</h2>
                <p className="text-slate-500 text-lg font-light">From registration to a ready plan — 5 minutes</p>
              </div>

              <div className="relative">
                <div className="absolute left-[19px] top-5 bottom-5 w-px bg-gradient-to-b from-indigo-200 via-indigo-300 to-transparent hidden sm:block" />
                <div className="space-y-3">
                  {[
                    { num: '01', role: 'Manager',   color: '#4f46e5', title: 'Creates a project',   desc: 'Clicks "New Project", gets a unique invite code and shares it with the team.' },
                    { num: '02', role: 'Team',       color: '#6366f1', title: 'Joins by code',        desc: 'Each member enters the invite code, sets their skills and available hours per day.' },
                    { num: '03', role: 'Manager',   color: '#4f46e5', title: 'Adds tasks',            desc: 'For each task: name, duration in hours, required skill, priority 1–5, deadline, and dependencies.' },
                    { num: '04', role: 'Algorithm', color: '#818cf8', title: 'Optimizes the plan',   desc: 'After clicking "Optimize", the genetic algorithm builds the optimal distribution in seconds.' },
                    { num: '05', role: 'Team',       color: '#6366f1', title: 'Gets to work',          desc: 'Assignees update task statuses (To Do → In Progress → Done) and write comments.' },
                  ].map((s, i) => (
                    <div key={i} className="step-card card p-5 flex items-start gap-5">
                      <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white syne z-10 relative"
                        style={{ background: s.color }}>
                        {s.num}
                      </div>
                      <div className="flex-1 pt-0.5">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <h3 className="syne font-semibold text-slate-900">{s.title}</h3>
                          <span className="pill-badge bg-slate-100 text-slate-500">
                            <span className="dot bg-slate-400" />{s.role}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 leading-relaxed font-light">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-10">
                <Link href="/guide" className="btn-secondary">Full guide →</Link>
              </div>
            </div>
          </section>


          {/* ─── ROLES ─── */}
          <section className="bg-white border-y border-slate-200 py-24">
            <div className="max-w-4xl mx-auto px-6">
              <div className="mb-14">
                <div className="tag bg-indigo-50 text-indigo-600 mb-4">Access</div>
                <h2 className="syne text-4xl font-extrabold text-slate-900 tracking-tight">Two roles in the system</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                <div className="feature-card relative bg-white rounded-2xl p-8" style={{ borderColor: 'rgba(79,70,229,.25)' }}>
                  <div className="w-12 h-12 rounded-2xl mb-5 flex items-center justify-center" style={{ background: 'var(--indigo-light)' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="1.5">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="syne text-xl font-bold text-slate-900">Manager</h3>
                    <span className="pill-badge bg-indigo-50 text-indigo-600">
                      <span className="dot bg-indigo-400" />manager
                    </span>
                  </div>
                  <ul className="space-y-2.5">
                    {['Creates the project and invites team','Adds, edits and deletes tasks','Runs optimization','Sees all three plan views','Assigns members manually','Manages member skills'].map((t, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 mt-0.5">
                          <path d="M2.5 7L5.5 10L11.5 4" stroke="#4f46e5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="feature-card bg-white rounded-2xl p-8">
                  <div className="w-12 h-12 rounded-2xl mb-5 flex items-center justify-center bg-slate-100">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="syne text-xl font-bold text-slate-900">Worker</h3>
                    <span className="pill-badge bg-slate-100 text-slate-500">
                      <span className="dot bg-slate-400" />worker
                    </span>
                  </div>
                  <ul className="space-y-2.5">
                    {['Joins the project by code','Views their tasks','Updates status: To Do → In Progress → Done','Writes task comments','Sets their skills and hours per day'].map((t, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 mt-0.5">
                          <path d="M2.5 7L5.5 10L11.5 4" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* ─── CTA ─── */}
          {!session && (
            <section className="py-24 text-center">
              <div className="max-w-2xl mx-auto px-6">
                <div className="tag bg-indigo-50 text-indigo-600 mb-6 mx-auto w-fit">Free to start</div>
                <h2 className="syne text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">Try it right now</h2>
                <p className="text-slate-500 mb-10 text-lg font-light">
                  Registration is free. Create a project and run optimization in a couple of minutes.
                </p>
                <div className="flex gap-3 justify-center flex-wrap">
                  <Link href="/register" className="btn-primary text-base px-8 py-3">Sign up →</Link>
                  <Link href="/guide" className="btn-secondary text-base px-8 py-3">Read the guide</Link>
                </div>
              </div>
            </section>
          )}

        </main>

        {/* ─── FOOTER ─── */}
        <footer className="border-t border-slate-200 bg-white px-6 py-6 flex items-center justify-between flex-wrap gap-4">
          <span className="syne text-lg font-bold text-indigo-600">Taskly</span>
          <div className="flex gap-6">
            {!session && (
              <>
                <Link href="/login" className="text-sm text-slate-400 hover:text-slate-600">Login</Link>
                <Link href="/register" className="text-sm text-slate-400 hover:text-slate-600">Sign up</Link>
              </>
            )}
          </div>
          <p className="text-sm text-slate-400 font-light">Support: taskly.support@gmail.com</p>
        </footer>

      </div>
    </>
  )
}