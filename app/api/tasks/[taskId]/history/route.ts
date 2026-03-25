import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

type Params = { params: { taskId: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await query(
    `SELECT h.*, u.username
     FROM history h JOIN users u ON u.id = h.changed_by
     WHERE h.task_id = $1
     ORDER BY h.changed_at DESC`,
    [params.taskId]
  )
  return NextResponse.json(rows)
}
