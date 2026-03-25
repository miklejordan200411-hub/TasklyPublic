import { NextRequest, NextResponse } from 'next/server'
import { query, withTransaction } from '@/lib/db'
import { getSession } from '@/lib/auth'

type Params = { params: { id: string } }

// GET /api/projects/[id]/tasks?status=&assigned_to=&priority=&search=
export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const statusFilter = url.searchParams.get('status')
  const assignedFilter = url.searchParams.get('assigned_to')
  const priorityFilter = url.searchParams.get('priority')
  const searchFilter = url.searchParams.get('search')

  const conditions: string[] = ['t.project_id = $1']
  const values: any[] = [params.id]
  let i = 2

  if (statusFilter) { conditions.push(`t.status = $${i++}`); values.push(statusFilter) }
  if (assignedFilter) { conditions.push(`t.assigned_to = $${i++}`); values.push(assignedFilter) }
  if (priorityFilter) { conditions.push(`t.priority = $${i++}`); values.push(Number(priorityFilter)) }
  if (searchFilter) { conditions.push(`t.name ILIKE $${i++}`); values.push(`%${searchFilter}%`) }

  const tasks = await query(
    `SELECT t.*, u.username as assigned_username
     FROM tasks t
     LEFT JOIN users u ON u.id = t.assigned_to
     WHERE ${conditions.join(' AND ')}
     ORDER BY t.priority DESC, t.created_at`,
    values
  )

  // Attach dependency IDs
  const taskIds = tasks.map((t: any) => t.id)
  let depsMap: Record<string, string[]> = {}
  if (taskIds.length > 0) {
    const deps = await query(
      `SELECT task_id, depends_on_id FROM task_dependencies WHERE task_id = ANY($1)`,
      [taskIds]
    )
    for (const d of deps) {
      if (!depsMap[d.task_id]) depsMap[d.task_id] = []
      depsMap[d.task_id].push(d.depends_on_id)
    }
  }

  return NextResponse.json(tasks.map((t: any) => ({ ...t, depends_on: depsMap[t.id] || [] })))
}

// POST /api/projects/[id]/tasks
export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only managers can create tasks
  const memberCheck = await query(
    `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2 AND removed_at IS NULL`,
    [params.id, session.sub]
  )
  if (memberCheck.length === 0 || memberCheck[0].role !== 'manager') {
    return NextResponse.json({ error: 'Only managers can create tasks' }, { status: 403 })
  }

  const { name, duration, skill, priority, deadline_days, depends_on } = await req.json()
  if (!name?.trim() || !duration) {
    return NextResponse.json({ error: 'Name and duration required' }, { status: 400 })
  }

  const rows = await query(
    `INSERT INTO tasks (project_id, name, duration, skill, priority, deadline_days)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [params.id, name.trim(), duration, skill || '', priority || 3, deadline_days || null]
  )
  const task = rows[0]

  // Insert dependencies
  if (depends_on && depends_on.length > 0) {
    for (const depId of depends_on) {
      await query(
        `INSERT INTO task_dependencies (task_id, depends_on_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [task.id, depId]
      )
    }
  }

  return NextResponse.json({ ...task, depends_on: depends_on || [] }, { status: 201 })
}
