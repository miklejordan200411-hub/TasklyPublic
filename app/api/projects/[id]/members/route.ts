import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

type Params = { params: { id: string } }

// GET /api/projects/[id]/members
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await query(
    `SELECT pm.*, u.username, u.email
     FROM project_members pm
     JOIN users u ON u.id = pm.user_id
     WHERE pm.project_id = $1 AND pm.removed_at IS NULL
     ORDER BY pm.joined_at`,
    [params.id]
  )
  return NextResponse.json(rows)
}

// PATCH /api/projects/[id]/members - update own skills/hours (or manager can update anyone)
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { user_id, skills, hours_per_day } = await req.json()
  const targetUserId = user_id || session.sub

  // Check if current user is manager OR updating themselves
  if (targetUserId !== session.sub) {
    const managerCheck = await query(
      `SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2 AND role = 'manager' AND removed_at IS NULL`,
      [params.id, session.sub]
    )
    if (managerCheck.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const updates: string[] = []
  const values: any[] = []
  let i = 1

  if (skills !== undefined) { updates.push(`skills = $${i++}`); values.push(skills) }
  if (hours_per_day !== undefined) { updates.push(`hours_per_day = $${i++}`); values.push(hours_per_day) }

  if (updates.length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  values.push(params.id, targetUserId)
  const rows = await query(
    `UPDATE project_members SET ${updates.join(', ')}
     WHERE project_id = $${i++} AND user_id = $${i} AND removed_at IS NULL
     RETURNING *`,
    values
  )
  return NextResponse.json(rows[0])
}
