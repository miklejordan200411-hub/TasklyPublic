import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession, generateInviteCode } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await query(
    `SELECT p.*, pm.role
     FROM projects p
     JOIN project_members pm ON pm.project_id = p.id
     WHERE pm.user_id = $1
       AND pm.removed_at IS NULL
       AND p.deleted_at IS NULL
     ORDER BY p.created_at DESC`,
    [session.sub]
  )
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, start_date } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const invite_code = generateInviteCode()
  const startDate = start_date || new Date().toISOString().split('T')[0]

  const rows = await query(
    `INSERT INTO projects (name, creator_id, invite_code, start_date)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [name.trim(), session.sub, invite_code, startDate]
  )
  const project = rows[0]

  await query(
    `INSERT INTO project_members (project_id, user_id, role, hours_per_day)
     VALUES ($1, $2, 'manager', 8)`,
    [project.id, session.sub]
  )

  return NextResponse.json(project, { status: 201 })
}