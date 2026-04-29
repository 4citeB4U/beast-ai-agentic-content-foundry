/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: AI.ORCHESTRATION.CORE.TASKGRAPH
TAG: AI.ORCHESTRATION.CORE.TASKGRAPH.ENGINE

COLOR_ONION_HEX:
NEON=#06B6D4
FLUO=#22D3EE
PASTEL=#CFFAFE

ICON_ASCII:
family=lucide
glyph=workflow

5WH:
WHAT = TaskGraph engine — tracks 10+ tasks in flight with bounded execution concurrency
WHY = Implements "many tasks queued, few executing" law; Brain Sentinel clamps RUNNING count
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = core/TaskGraph.ts
WHEN = 2026
HOW = In-memory TaskMap + IndexedDB persistence; Brain Sentinel budget enforced per tick

AGENTS:
ASSESS
AUDIT
BRAIN
ARCHIVE

LICENSE:
MIT
*/

// core/TaskGraph.ts
// TaskGraph — tracks unlimited tasks in PLANNED/QUEUED/WAITING while limiting RUNNING by Brain budget.

import { type TaskRecord, type TaskState, type WorkflowId, type Zone, MODE_BUDGETS, type RuntimeMode } from './GovernanceContract';
import { eventBus } from './EventBus';
import { MemoryDB } from './MemoryDB';

const TASK_GRAPH_KEY = 'agent_lee_task_graph';

// ── TaskGraph ─────────────────────────────────────────────────
class TaskGraphEngine {
  private tasks: Map<string, TaskRecord> = new Map();
  private currentMode: RuntimeMode = 'BALANCED';
  private loaded = false;
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private stateCounts: Map<string, number> = new Map();
  private dirty = false;

  // ── Persistence (debounced — batches writes over 500ms) ─────
  private schedulePersist(): void {
    if (this.persistTimer) return; // already scheduled
    this.dirty = true;
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      this.dirty = false;
      MemoryDB.set(TASK_GRAPH_KEY, Object.fromEntries(this.tasks)).catch(err =>
        console.error('[TaskGraph] Persist failed:', err)
      );
    }, 500);
  }

  /** Force-flush pending writes (e.g. before shutdown) */
  async flush(): Promise<void> {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    if (this.dirty) {
      this.dirty = false;
      await MemoryDB.set(TASK_GRAPH_KEY, Object.fromEntries(this.tasks));
    }
  }

  async load(): Promise<void> {
    if (this.loaded) return;
    const stored = await MemoryDB.get<Record<string, TaskRecord>>(TASK_GRAPH_KEY);
    if (stored) {
      for (const [id, task] of Object.entries(stored)) {
        // Resume: any task that was RUNNING becomes QUEUED on restart
        if (task.state === 'RUNNING') task.state = 'QUEUED';
        this.tasks.set(id, task);
      }
    }
    this.rebuildCounts();
    this.loaded = true;
  }

  // ── Mode ─────────────────────────────────────────────────────
  setMode(mode: RuntimeMode): void {
    this.currentMode = mode;
    eventBus.emit('agent:active', { agent: 'BrainSentinel', task: `Mode → ${mode}` });
  }

  getMode(): RuntimeMode { return this.currentMode; }

  getBudget() { return MODE_BUDGETS[this.currentMode]; }

  // ── Task CRUD ────────────────────────────────────────────────
  add(
    objective: string,
    workflow: WorkflowId,
    lead: string,
    helpers: string[],
    zone: Zone = 'Z0_AGENTVM',
    risk: TaskRecord['risk'] = 'low',
    dependencies: string[] = [],
  ): TaskRecord {
    const task_id = `${workflow}-${lead.toUpperCase()}-${Date.now()}`;
    const now = new Date().toISOString();
    const task: TaskRecord = {
      task_id, objective, zone, workflow, lead, helpers,
      state: 'PLANNED',
      created_at: now, updated_at: now,
      risk, dependencies, artifacts: [],
    };
    this.tasks.set(task_id, task);
    this.incrementCount('PLANNED');
    this.schedulePersist();
    eventBus.emit('agent:active', { agent: 'AgentLee', task: `Task queued: ${task_id} — ${objective.slice(0, 60)}` });
    return task;
  }

  transition(task_id: string, newState: TaskState): boolean {
    const task = this.tasks.get(task_id);
    if (!task) return false;

    // Enforce budget before allowing RUNNING
    if (newState === 'RUNNING') {
      const budget = this.getBudget();
      const runCount = this.countByState('RUNNING');
      if (runCount >= budget.maxActiveAgents) return false; // not allowed yet
    }

    const oldState = task.state;
    task.state = newState;
    task.updated_at = new Date().toISOString();
    this.decrementCount(oldState);
    this.incrementCount(newState);
    this.schedulePersist();
    return true;
  }

  get(task_id: string): TaskRecord | undefined {
    return this.tasks.get(task_id);
  }

  getAll(): TaskRecord[] {
    return Array.from(this.tasks.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  getByState(state: TaskState): TaskRecord[] {
    return Array.from(this.tasks.values()).filter(t => t.state === state);
  }

  countByState(state: TaskState): number {
    return this.stateCounts.get(state) || 0;
  }

  private incrementCount(state: string): void {
    this.stateCounts.set(state, (this.stateCounts.get(state) || 0) + 1);
  }

  private decrementCount(state: string): void {
    const current = this.stateCounts.get(state) || 0;
    this.stateCounts.set(state, Math.max(0, current - 1));
  }

  /** Rebuild cached counts from task map (called after load) */
  private rebuildCounts(): void {
    this.stateCounts.clear();
    for (const t of this.tasks.values()) {
      this.incrementCount(t.state);
    }
  }

  // ── Scheduler tick ───────────────────────────────────────────
  /** Promote QUEUED → RUNNING up to budget. Returns tasks promoted. */
  tick(): TaskRecord[] {
    const budget = this.getBudget();
    const running = this.countByState('RUNNING');
    const budget_remaining = budget.maxActiveAgents - running;
    if (budget_remaining <= 0) return [];

    const queued = this.getByState('QUEUED');
    const promoted: TaskRecord[] = [];

    for (const task of queued) {
      if (promoted.length >= budget_remaining) break;
      // Check dependencies
      const depsReady = task.dependencies.every(depId => {
        const dep = this.tasks.get(depId);
        return dep?.state === 'DONE';
      });
      if (!depsReady) {
        this.decrementCount('QUEUED');
        task.state = 'WAITING';
        this.incrementCount('WAITING');
        continue;
      }
      this.decrementCount('QUEUED');
      task.state = 'RUNNING';
      this.incrementCount('RUNNING');
      task.updated_at = new Date().toISOString();
      promoted.push(task);
    }

    if (promoted.length > 0) this.schedulePersist();
    return promoted;
  }

  // ── Status for /lee.status ────────────────────────────────────
  status(): {
    mode: RuntimeMode;
    budget: ReturnType<TaskGraphEngine['getBudget']>;
    counts: Record<TaskState, number>;
    recentTasks: TaskRecord[];
  } {
    const states: TaskState[] = ['PLANNED', 'QUEUED', 'RUNNING', 'WAITING', 'BLOCKED', 'DONE', 'FAILED'];
    const counts = Object.fromEntries(states.map(s => [s, this.countByState(s)])) as Record<TaskState, number>;
    const recentTasks = this.getAll().slice(0, 5);
    return { mode: this.currentMode, budget: this.getBudget(), counts, recentTasks };
  }

  // ── Queue plan (queue a task) ─────────────────────────────────
  enqueue(task_id: string): boolean {
    return this.transition(task_id, 'QUEUED');
  }

  complete(task_id: string, artifacts: string[] = []): void {
    const task = this.tasks.get(task_id);
    if (!task) return;
    const oldState = task.state;
    task.state = 'DONE';
    task.artifacts = artifacts;
    task.updated_at = new Date().toISOString();
    this.decrementCount(oldState);
    this.incrementCount('DONE');
    this.schedulePersist();
    eventBus.emit('agent:done', { agent: task.lead, result: `Task ${task_id} DONE` });
  }

  fail(task_id: string, reason: string): void {
    const task = this.tasks.get(task_id);
    if (!task) return;
    const oldState = task.state;
    task.state = 'FAILED';
    task.updated_at = new Date().toISOString();
    this.decrementCount(oldState);
    this.incrementCount('FAILED');
    this.schedulePersist();
    eventBus.emit('agent:error', { agent: task.lead, error: `Task ${task_id} FAILED: ${reason}` });
  }
}

export const TaskGraph = new TaskGraphEngine();
