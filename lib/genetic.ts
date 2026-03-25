import { Task, ProjectMember, OptimizationResult, AssignedTask, WorkerSchedule } from '@/types'

interface Individual {
  assignments: number[]
  score: number
}

interface ScheduleEntry {
  taskId: string
  workerId: string
  startDay: number
  endDay: number
}

interface ScheduleEntryHours extends ScheduleEntry {
  startHour: number
  endHour: number
  workerHpd: number
}

interface EvaluationInput {
  tasks: Task[]
  workers: ProjectMember[]
  dependencies: { task_id: string; depends_on_id: string }[]
}

const POPULATION_SIZE = 80
const GENERATIONS = 60
const ELITE_RATIO = 0.2
const TOURNAMENT_SIZE = 4
const MUTATION_RATE = 0.12
const CROSSOVER_RATE = 0.75

const PENALTY = {
  DEPENDENCY_VIOLATED: -1000,  // жёсткое ограничение — нарушать нельзя никогда
  WRONG_SKILL: -250,           // навык критичен для качества работы
  CRITICAL_LATE: -150,         // приоритет 5 просрочен — катастрофа
  DEADLINE_MISS_PER_DAY: -50,  // каждый день просрочки дорого стоит
  OVERWORK: -40,               // перегруз снижает качество
  OVERWORK_SEVERE: -100,       // >125% hpd — недопустимо
  UNDERWORK: -5,               // небольшой штраф за простой
  LOAD_IMBALANCE: -20,         // неравномерность нагрузки
  LOW_PRIORITY_FIRST: -30,     // низкоприоритетная задача раньше высокой
  UNASSIGNED: -500,            // задача без исполнителя
}

const BONUS = {
  SKILL_MATCH: 30,             // увеличено — навык важен
  HIGH_PRIORITY_FIRST: 40,     // правильный порядок приоритетов
  CRITICAL_EARLY: 80,          // приоритет 5 сдан раньше срока
  DEADLINE_EARLY: 10,          // любая задача сдана раньше срока
  EVEN_LOAD: 60,               // равномерная нагрузка — идеал
  DEPENDENCY_TIGHT: 15,        // зависимость без лишнего ожидания (buffer <= 2h)
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function topoSort(tasks: Task[], depMap: Map<string, string[]>): Task[] {
  const taskById = new Map(tasks.map(t => [t.id, t]))
  const visited = new Set<string>()
  const result: Task[] = []

  function visit(id: string): void {
    if (visited.has(id)) return
    visited.add(id)
    for (const dep of depMap.get(id) ?? []) {
      if (taskById.has(dep)) visit(dep)
    }
    const t = taskById.get(id)
    if (t) result.push(t)
  }

  const prioritised = [...tasks].sort((a, b) => b.priority - a.priority)
  for (const t of prioritised) visit(t.id)
  return result
}

function buildScheduleHours(
  assignments: number[],
  tasks: Task[],
  workers: ProjectMember[],
  depMap: Map<string, string[]>
): ScheduleEntryHours[] {
  const taskIndexMap = new Map(tasks.map((t, i) => [t.id, i]))
  const workerNextHour: number[] = new Array(workers.length).fill(0)
  const taskEndHour = new Map<string, number>()
  const result: ScheduleEntryHours[] = []

  for (const task of topoSort(tasks, depMap)) {
    const taskIdx = taskIndexMap.get(task.id)
    if (taskIdx === undefined) continue
    const workerIdx = assignments[taskIdx]
    if (workerIdx === -1 || workerIdx >= workers.length) continue

    const worker = workers[workerIdx]
    const hpd = Math.max(1, Number(worker.hours_per_day) || 8)
    const duration = Math.max(0.5, Number(task.duration))

    // ── Жёсткое ограничение зависимостей ──────────────────
    // Задача НЕ МОЖЕТ начаться пока все её зависимости не завершены
    // Независимо от того на каком работнике они выполняются
    let depEarliestHour = 0
    for (const depId of depMap.get(task.id) ?? []) {
      const deh = taskEndHour.get(depId)
      if (deh === undefined) {
        // Зависимость ещё не запланирована — это значит topoSort
        // вернул неправильный порядок (цикл в зависимостях)
        // Ставим задачу в самый конец известного расписания
        const maxKnown = Math.max(0, ...Array.from(taskEndHour.values()))
        depEarliestHour = Math.max(depEarliestHour, maxKnown)
      } else {
        depEarliestHour = Math.max(depEarliestHour, deh)
      }
    }

    // Начинаем не раньше чем: работник свободен И все зависимости завершены
    let startHour = Math.max(workerNextHour[workerIdx], depEarliestHour)

    // Если задача не помещается в остаток текущего дня — переносим на следующий
    const dayStart = Math.floor(startHour / hpd) * hpd
    const hoursUsedInDay = startHour - dayStart
    const remainingInDay = hpd - hoursUsedInDay
    if (duration > remainingInDay && hoursUsedInDay > 0) {
      startHour = dayStart + hpd
    }

    const endHour = startHour + duration
    const startDay = Math.floor(startHour / hpd) + 1
    const endDay = Math.max(startDay, Math.ceil(endHour / hpd))

    workerNextHour[workerIdx] = endHour
    taskEndHour.set(task.id, endHour)

    result.push({
      taskId: task.id,
      workerId: worker.user_id,
      startDay,
      endDay,
      startHour,
      endHour,
      workerHpd: hpd,
    })
  }

  return result
}
function buildSchedule(
  assignments: number[],
  tasks: Task[],
  workers: ProjectMember[],
  depMap: Map<string, string[]>
): ScheduleEntry[] {
  return buildScheduleHours(assignments, tasks, workers, depMap)
}

function evaluate(
  individual: Individual,
  tasks: Task[],
  workers: ProjectMember[],
  depMap: Map<string, string[]>
): number {
  let score = 1000
  const schedule = buildScheduleHours(individual.assignments, tasks, workers, depMap)
  const schedMap = new Map(schedule.map(s => [s.taskId, s]))
  const taskMap = new Map(tasks.map(t => [t.id, t]))
  const workerMap = new Map(workers.map(w => [w.user_id, w]))

  // ── Назначение ───────────────────────────────────────────
  for (let i = 0; i < tasks.length; i++) {
    const wIdx = individual.assignments[i]
    if (wIdx === -1 || wIdx >= workers.length) {
      score += PENALTY.UNASSIGNED
    }
  }

  // ── Навыки ───────────────────────────────────────────────
  for (let i = 0; i < tasks.length; i++) {
    const wIdx = individual.assignments[i]
    if (wIdx === -1 || wIdx >= workers.length) continue
    const task = tasks[i]
    const worker = workers[wIdx]
    if (!task.skill) continue
    score += worker.skills.includes(task.skill)
      ? BONUS.SKILL_MATCH
      : PENALTY.WRONG_SKILL
  }

  // ── Дедлайны ─────────────────────────────────────────────
  for (const s of schedule) {
    const task = taskMap.get(s.taskId)
    if (!task || task.deadline_days == null) continue

    if (s.endDay > task.deadline_days) {
      const daysLate = s.endDay - task.deadline_days
      score += PENALTY.DEADLINE_MISS_PER_DAY * daysLate
      if (task.priority === 5) score += PENALTY.CRITICAL_LATE
      // Чем выше приоритет — тем дороже просрочка
      score += PENALTY.DEADLINE_MISS_PER_DAY * daysLate * (task.priority - 1) * 0.5
    } else {
      const daysEarly = task.deadline_days - s.endDay
      score += BONUS.DEADLINE_EARLY * Math.min(daysEarly, 5)
      if (task.priority === 5) {
        score += BONUS.CRITICAL_EARLY + Math.min(daysEarly * 10, 50)
      }
    }
  }

  // ── Зависимости ──────────────────────────────────────────
  for (const [taskId, deps] of Array.from(depMap.entries())) {
    const s = schedMap.get(taskId)
    if (!s) continue
    for (const depId of deps) {
      const depS = schedMap.get(depId)
      if (!depS) continue
      if (s.startHour < depS.endHour) {
        // Жёсткое нарушение — задача начата до окончания зависимости
        score += PENALTY.DEPENDENCY_VIOLATED
      } else {
        const buffer = s.startHour - depS.endHour
        if (buffer <= 2) {
          // Плотное расписание без простоев — идеал
          score += BONUS.DEPENDENCY_TIGHT
        }
        // Большой буфер — не штрафуем, но и не поощряем
      }
    }
  }

  // ── Нагрузка по дням ─────────────────────────────────────
  const workerDailyHours = new Map<string, Map<number, number>>()
  for (const s of schedule) {
    const task = taskMap.get(s.taskId)
    if (!task) continue
    const days = s.endDay - s.startDay + 1
    const dailyH = Number(task.duration) / days
    if (!workerDailyHours.has(s.workerId)) workerDailyHours.set(s.workerId, new Map())
    const dayMap = workerDailyHours.get(s.workerId)!
    for (let d = s.startDay; d <= s.endDay; d++) {
      dayMap.set(d, (dayMap.get(d) ?? 0) + dailyH)
    }
  }

  for (const [workerId, dayMap] of Array.from(workerDailyHours.entries())) {
    const w = workerMap.get(workerId)
    const hpd = w ? Math.max(1, Number(w.hours_per_day) || 8) : 8
    for (const [, hours] of Array.from(dayMap.entries())) {
      if (hours > hpd * 1.25) score += PENALTY.OVERWORK_SEVERE
      else if (hours > hpd) score += PENALTY.OVERWORK
      else if (hours < 2) score += PENALTY.UNDERWORK
    }
  }

  // ── Баланс нагрузки ──────────────────────────────────────
  const totalHoursPerWorker = workers.map(w =>
    schedule
      .filter(s => s.workerId === w.user_id)
      .reduce((sum, s) => {
        const task = taskMap.get(s.taskId)
        return sum + (task ? Number(task.duration) : 0)
      }, 0)
  )
  if (totalHoursPerWorker.length > 1) {
    const maxH = Math.max(...totalHoursPerWorker)
    const minH = Math.min(...totalHoursPerWorker)
    const avgH = totalHoursPerWorker.reduce((a, b) => a + b, 0) / totalHoursPerWorker.length
    if (maxH - minH > 8) {
      score += PENALTY.LOAD_IMBALANCE * Math.floor((maxH - minH) / 4)
    }
    if (avgH > 0 && totalHoursPerWorker.every(h => h >= avgH * 0.85 && h <= avgH * 1.15)) {
      score += BONUS.EVEN_LOAD
    }
  }

  // ── Порядок приоритетов ───────────────────────────────────
  const byWorker = new Map<string, ScheduleEntryHours[]>()
  for (const s of schedule) {
    if (!byWorker.has(s.workerId)) byWorker.set(s.workerId, [])
    byWorker.get(s.workerId)!.push(s)
  }
  for (const [, wSchedule] of Array.from(byWorker.entries())) {
    const chronological = [...wSchedule].sort((a, b) => a.startHour - b.startHour)
    let violation = false
    let prevPriority = Infinity
    for (const s of chronological) {
      const task = taskMap.get(s.taskId)
      if (!task) continue
      if (task.priority > prevPriority) {
        score += PENALTY.LOW_PRIORITY_FIRST
        violation = true
      }
      prevPriority = task.priority
    }
    if (!violation && chronological.length > 1) score += BONUS.HIGH_PRIORITY_FIRST
  }

  return score
}
function createRandom(taskCount: number, workerCount: number): Individual {
  return {
    assignments: Array.from({ length: taskCount }, () =>
      workerCount > 0 ? randomInt(0, workerCount - 1) : -1
    ),
    score: 0,
  }
}

function crossover(a: Individual, b: Individual): Individual {
  return {
    assignments: a.assignments.map((gene, i) =>
      Math.random() < CROSSOVER_RATE ? gene : b.assignments[i]
    ),
    score: 0,
  }
}

function mutate(ind: Individual, workerCount: number): Individual {
  return {
    assignments: ind.assignments.map(gene =>
      Math.random() < MUTATION_RATE && workerCount > 0
        ? randomInt(0, workerCount - 1)
        : gene
    ),
    score: 0,
  }
}

function tournamentSelect(population: Individual[]): Individual {
  let best = population[randomInt(0, population.length - 1)]
  for (let i = 1; i < TOURNAMENT_SIZE; i++) {
    const candidate = population[randomInt(0, population.length - 1)]
    if (candidate.score > best.score) best = candidate
  }
  return best
}

export function runGeneticOptimization(input: EvaluationInput): OptimizationResult {
  const { tasks, workers, dependencies } = input

  if (tasks.length === 0 || workers.length === 0) {
    return {
      score: 0, assignments: [], schedule: [],
      warnings: workers.length === 0 ? ['No workers in project'] : ['No tasks to optimize'],
    }
  }

  const depMap = new Map<string, string[]>()
  for (const dep of dependencies) {
    if (!depMap.has(dep.task_id)) depMap.set(dep.task_id, [])
    depMap.get(dep.task_id)!.push(dep.depends_on_id)
  }

  let population: Individual[] = Array.from({ length: POPULATION_SIZE }, () => {
    const ind = createRandom(tasks.length, workers.length)
    ind.score = evaluate(ind, tasks, workers, depMap)
    return ind
  })

  for (let gen = 0; gen < GENERATIONS; gen++) {
    population.sort((a, b) => b.score - a.score)
    const eliteCount = Math.max(2, Math.floor(POPULATION_SIZE * ELITE_RATIO))
    const newPop: Individual[] = population.slice(0, eliteCount).map(ind => ({ ...ind }))

    while (newPop.length < POPULATION_SIZE) {
      let child = crossover(tournamentSelect(population), tournamentSelect(population))
      child = mutate(child, workers.length)
      child.score = evaluate(child, tasks, workers, depMap)
      newPop.push(child)
    }
    population = newPop
  }

  population.sort((a, b) => b.score - a.score)
  const best = population[0]
  const schedule = buildSchedule(best.assignments, tasks, workers, depMap) as ScheduleEntryHours[]

  const taskMapFinal = new Map(tasks.map(t => [t.id, t]))
  const assignments = schedule.map(s => ({
    task_id: s.taskId,
    user_id: s.workerId,
    start_day: s.startDay,
    end_day: s.endDay,
  }))

  const projectEndDay = schedule.length > 0 ? Math.max(...schedule.map(s => s.endDay)) : 1

  const workerSchedules: WorkerSchedule[] = workers.map(w => {
    const wItems = schedule.filter(s => s.workerId === w.user_id)
    const assignedTasks: AssignedTask[] = wItems.map(s => {
      const task = taskMapFinal.get(s.taskId)!
      return {
        task_id: s.taskId,
        task_name: task.name,
        skill: task.skill,
        duration: Number(task.duration),
        priority: task.priority,
        start_day: s.startDay,
        end_day: s.endDay,
        deadline_days: task.deadline_days,
        start_hour: s.startHour,
        end_hour: s.endHour,
        worker_hpd: s.workerHpd,
      } as AssignedTask
    })

    const totalHours = assignedTasks.reduce((sum, t) => sum + t.duration, 0)
    const hoursPerDay = Number(w.hours_per_day) || 8

    return {
      user_id: w.user_id,
      username: w.username || w.user_id,
      hours_per_day: hoursPerDay,
      skills: w.skills,
      assigned_tasks: assignedTasks,
      total_hours: totalHours,
      utilization_percent: projectEndDay > 0
        ? Math.round((totalHours / (hoursPerDay * projectEndDay)) * 100)
        : 0,
    }
  })

  const warnings: string[] = []

  for (const ws of workerSchedules) {
    if (ws.utilization_percent > 120)
      warnings.push(`${ws.username} is heavily overloaded (${ws.utilization_percent}% utilization)`)
    else if (ws.utilization_percent > 100)
      warnings.push(`${ws.username} is overloaded (${ws.utilization_percent}% utilization)`)
    else if (ws.utilization_percent < 15 && ws.assigned_tasks.length === 0)
      warnings.push(`${ws.username} has no tasks assigned`)
  }

  for (const s of schedule) {
    const task = taskMapFinal.get(s.taskId)
    if (task?.deadline_days != null && s.endDay > task.deadline_days) {
      const d = s.endDay - task.deadline_days
      warnings.push(`"${task.name}" misses deadline by ${d} day${d !== 1 ? 's' : ''}`)
    }
  }

  for (const task of tasks) {
    if (!task.skill) continue
    if (!workers.some(w => w.skills.includes(task.skill!)))
      warnings.push(`No worker has skill "${task.skill}" required by "${task.name}"`)
  }

  return { score: best.score, assignments, schedule: workerSchedules, warnings }
}