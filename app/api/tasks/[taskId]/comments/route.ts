import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

type Params = { params: { taskId: string } }

// GET /api/tasks/[taskId]/comments
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await query(
    `SELECT c.*, u.username
     FROM comments c JOIN users u ON u.id = c.user_id
     WHERE c.task_id = $1
     ORDER BY c.created_at`,
    [params.taskId]
  )
  return NextResponse.json(rows)
}

// POST /api/tasks/[taskId]/comments
export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { text } = await req.json()
  if (!text?.trim()) return NextResponse.json({ error: 'Text required' }, { status: 400 })

  const rows = await query(
    `INSERT INTO comments (task_id, user_id, text) VALUES ($1, $2, $3)
     RETURNING *, (SELECT username FROM users WHERE id = $2) as username`,
    [params.taskId, session.sub, text.trim()]
  )
  return NextResponse.json(rows[0], { status: 201 })
}

// DELETE /api/tasks/[taskId]/comments?comment_id=
export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const commentId = url.searchParams.get('comment_id')
  if (!commentId) return NextResponse.json({ error: 'comment_id required' }, { status: 400 })

  const rows = await query(
    `DELETE FROM comments WHERE id = $1 AND user_id = $2 RETURNING id`,
    [commentId, session.sub]
  )
  if (rows.length === 0) return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
