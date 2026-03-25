import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

type Params = { params: { id: string } }

// GET /api/projects/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await query(
    `SELECT p.*, pm.role
     FROM projects p
     JOIN project_members pm ON pm.project_id = p.id
     WHERE p.id = $1 AND pm.user_id = $2 AND pm.removed_at IS NULL AND p.deleted_at IS NULL`,
    [params.id, session.sub]
  )
  if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(rows[0])
}

// DELETE /api/projects/[id] — only creator
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await query(
    `SELECT * FROM projects WHERE id = $1 AND creator_id = $2 AND deleted_at IS NULL`,
    [params.id, session.sub]
  )
  if (rows.length === 0) return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 })

  await query(`UPDATE projects SET deleted_at = NOW() WHERE id = $1`, [params.id])
  return NextResponse.json({ ok: true })
}
