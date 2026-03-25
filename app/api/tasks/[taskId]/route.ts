import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

type Params = { params: { taskId: string } }

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, duration, skill, priority, deadline_days, assigned_to, status, depends_on } = body

  const taskRows = await query(`SELECT * FROM tasks WHERE id = $1`, [params.taskId])
  if (taskRows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const task = taskRows[0]

  const member = await query(
    `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2 AND removed_at IS NULL`,
    [task.project_id, session.sub]
  )
  if (member.length === 0) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const isManager = member[0].role === 'manager'

  const updates: string[] = []
  const values: any[] = []
  let i = 1

  if (status !== undefined) { updates.push(`status = $${i++}`); values.push(status) }
  if (isManager) {
    if (name !== undefined) { updates.push(`name = $${i++}`); values.push(name) }
    if (duration !== undefined) { updates.push(`duration = $${i++}`); values.push(duration) }
    if (skill !== undefined) { updates.push(`skill = $${i++}`); values.push(skill) }
    if (priority !== undefined) { updates.push(`priority = $${i++}`); values.push(priority) }
    if (deadline_days !== undefined) { updates.push(`deadline_days = $${i++}`); values.push(deadline_days === '' ? null : deadline_days) }
    if (assigned_to !== undefined) { updates.push(`assigned_to = $${i++}`); values.push(assigned_to === '' ? null : assigned_to) }
  }

  if (updates.length === 0 && depends_on === undefined) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  let updatedTask = task

  if (updates.length > 0) {
    updates.push(`updated_at = NOW()`)
    values.push(params.taskId)
    const rows = await query(
      `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    )
    updatedTask = rows[0]

    // Write history manually (no trigger dependency)
    const fieldMap: Record<string, any> = { name, duration, skill, priority, deadline_days, assigned_to, status }
    for (const [field, newVal] of Object.entries(fieldMap)) {
      if (newVal === undefined) continue
      const oldVal = task[field]
      if (String(oldVal ?? '') !== String(newVal ?? '')) {
        await query(
          `INSERT INTO history (task_id, field_changed, old_value, new_value, changed_by)
           VALUES ($1, $2, $3, $4, $5)`,
          [params.taskId, field, String(oldVal ?? ''), String(newVal ?? ''), session.sub]
        ).catch(() => {}) // ignore history errors
      }
    }
  }

  if (isManager && depends_on !== undefined) {
    await query(`DELETE FROM task_dependencies WHERE task_id = $1`, [params.taskId])
    for (const depId of depends_on) {
      await query(
        `INSERT INTO task_dependencies (task_id, depends_on_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [params.taskId, depId]
      )
    }
  }

  return NextResponse.json(updatedTask)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const taskRows = await query(`SELECT * FROM tasks WHERE id = $1`, [params.taskId])
  if (taskRows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const task = taskRows[0]

  const member = await query(
    `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2 AND removed_at IS NULL`,
    [task.project_id, session.sub]
  )
  if (member.length === 0 || member[0].role !== 'manager') {
    return NextResponse.json({ error: 'Only managers can delete tasks' }, { status: 403 })
  }

  await query(`DELETE FROM task_dependencies WHERE task_id = $1 OR depends_on_id = $1`, [params.taskId])
  await query(`DELETE FROM comments WHERE task_id = $1`, [params.taskId])
  await query(`DELETE FROM history WHERE task_id = $1`, [params.taskId])
  await query(`DELETE FROM tasks WHERE id = $1`, [params.taskId])
  return NextResponse.json({ ok: true })
}