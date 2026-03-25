import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { runGeneticOptimization } from '@/lib/genetic'

type Params = { params: { id: string } }

// POST /api/projects/[id]/optimize
export async function POST(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only managers
  const memberCheck = await query(
    `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2 AND removed_at IS NULL`,
    [params.id, session.sub]
  )
  if (memberCheck.length === 0 || memberCheck[0].role !== 'manager') {
    return NextResponse.json({ error: 'Only managers can optimize' }, { status: 403 })
  }

  // Load tasks
  const tasks = await query(
    `SELECT * FROM tasks WHERE project_id = $1 ORDER BY priority DESC`,
    [params.id]
  )

  // Load workers (not managers? actually managers can also be workers — include everyone)
  const workers = await query(
    `SELECT pm.*, u.username
     FROM project_members pm
     JOIN users u ON u.id = pm.user_id
     WHERE pm.project_id = $1 AND pm.removed_at IS NULL`,
    [params.id]
  )

  // Load dependencies
  const taskIds = tasks.map((t: any) => t.id)
  const dependencies = taskIds.length > 0
    ? await query(
        `SELECT task_id, depends_on_id FROM task_dependencies WHERE task_id = ANY($1)`,
        [taskIds]
      )
    : []

  const result = runGeneticOptimization({ tasks, workers, dependencies })

  // Apply assignments back to tasks
  for (const assignment of result.assignments) {
    await query(
      `UPDATE tasks SET assigned_to = $1 WHERE id = $2`,
      [assignment.user_id, assignment.task_id]
    )
  }

  return NextResponse.json(result)
}
