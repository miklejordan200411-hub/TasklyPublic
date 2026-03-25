import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

// POST /api/projects/join
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { invite_code } = await req.json()
  if (!invite_code) return NextResponse.json({ error: 'Invite code required' }, { status: 400 })

  const projects = await query(
    `SELECT * FROM projects WHERE invite_code = $1 AND deleted_at IS NULL`,
    [invite_code.trim().toUpperCase()]
  )
  if (projects.length === 0) {
    return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
  }
  const project = projects[0]

  // Check if already member
  const existing = await query(
    `SELECT id FROM project_members
     WHERE project_id = $1 AND user_id = $2 AND removed_at IS NULL`,
    [project.id, session.sub]
  )
  if (existing.length > 0) {
    return NextResponse.json({ error: 'Already a member' }, { status: 409 })
  }

  await query(
    `INSERT INTO project_members (project_id, user_id, role, hours_per_day)
     VALUES ($1, $2, 'worker', 8)`,
    [project.id, session.sub]
  )

  return NextResponse.json(project, { status: 201 })
}
