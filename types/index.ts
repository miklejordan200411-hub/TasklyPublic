export interface User {
  id: string
  username: string
  email: string
  created_at: string
}

export interface Project {
  id: string
  name: string
  creator_id: string
  invite_code: string
  created_at: string
  deleted_at: string | null
}

export interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  role: 'manager' | 'worker'
  skills: string[]
  hours_per_day: number
  joined_at: string
  removed_at: string | null
  // joined from users
  username?: string
  email?: string
}

export interface Task {
  id: string
  project_id: string
  name: string
  duration: number
  skill: string
  priority: 1 | 2 | 3 | 4 | 5
  deadline_days: number | null
  assigned_to: string | null
  status: 'To Do' | 'In Progress' | 'Done' | 'Blocked'
  created_at: string
  updated_at: string
  // joined
  assigned_username?: string
  depends_on?: string[]  // task IDs
}

export interface TaskDependency {
  id: string
  task_id: string
  depends_on_id: string
}

export interface Comment {
  id: string
  task_id: string
  user_id: string
  text: string
  created_at: string
  username?: string
}

export interface HistoryEntry {
  id: string
  task_id: string
  field_changed: string
  old_value: string | null
  new_value: string | null
  changed_by: string
  changed_at: string
  username?: string
}

// Genetic algorithm types
export interface WorkerSchedule {
  user_id: string
  username: string
  hours_per_day: number
  skills: string[]
  assigned_tasks: AssignedTask[]
  total_hours: number
  utilization_percent: number
}

export interface AssignedTask {
  task_id: string
  task_name: string
  skill: string
  duration: number
  priority: number
  start_day: number
  end_day: number
  deadline_days: number | null
}

export interface OptimizationResult {
  score: number
  assignments: { task_id: string; user_id: string; start_day: number; end_day: number }[]
  schedule: WorkerSchedule[]
  warnings: string[]
}

export interface JWTPayload {
  sub: string     // user id
  username: string
  iat: number
  exp: number
}