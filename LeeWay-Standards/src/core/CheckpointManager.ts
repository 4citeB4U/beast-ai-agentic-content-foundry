/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: AI.ORCHESTRATION.CORE.CHECKPOINT
TAG: AI.ORCHESTRATION.CORE.CHECKPOINT.MANAGER

COLOR_ONION_HEX:
NEON=#10B981
FLUO=#34D399
PASTEL=#D1FAE5

ICON_ASCII:
family=lucide
glyph=save

5WH:
WHAT = Checkpoint/resume protocol — immutable before/after snapshots for every WRITE step
WHY = Guarantees crash recovery and audit trail; no write step executes without a before-checkpoint
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = core/CheckpointManager.ts
WHEN = 2026
HOW = Backed by MemoryDB (IndexedDB); each checkpoint has taskId, phase, state, and artifact list

AGENTS:
ASSESS
AUDIT
ARCHIVE

LICENSE:
MIT
*/

// core/CheckpointManager.ts
// Immutable before/after snapshots for every WRITE operation.
// Allows crash recovery and full audit trail.

import { type WorkflowId, type TaskState, type Zone, type RuntimeMode } from './GovernanceContract';
import { MemoryDB } from './MemoryDB';
import { eventBus } from './EventBus';
import { ReportWriter } from './ReportWriter';

export type CheckpointPhase = 'before' | 'after';

export interface Checkpoint {
  /** e.g. cp_2026-04-03T18:22:10Z_0012 */
  checkpoint_id: string;
  task_id: string;
  parent_task_id?: string;
  phase: CheckpointPhase;
  workflow: WorkflowId;
  state: TaskState;
  lead: string;
  helpers: string[];
  mode: RuntimeMode;
  zone: Zone;
  inputs: Record<string, unknown>;
  actions: Array<{ type: 'READ' | 'WRITE'; target: string; summary: string }>;
  artifacts: string[];
  risks: string[];
  next_step: string;
  created_at: string;
}

const CHECKPOINT_LIST_KEY = 'agent_lee_checkpoints';
const MAX_CHECKPOINTS = 200;

// ── CheckpointManager ─────────────────────────────────────────
class CheckpointManagerClass {
  private counter = 0;

  private makeId(): string {
    this.counter++;
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    return `cp_${ts}_${String(this.counter).padStart(4, '0')}`;
  }

  /** Create a before or after checkpoint for a task write operation. */
  async create(
    phase: CheckpointPhase,
    task_id: string,
    workflow: WorkflowId,
    state: TaskState,
    lead: string,
    helpers: string[],
    mode: RuntimeMode,
    zone: Zone,
    inputs: Record<string, unknown>,
    actions: Checkpoint['actions'],
    artifacts: string[],
    risks: string[],
    next_step: string,
    parent_task_id?: string,
  ): Promise<Checkpoint> {
    const cp: Checkpoint = {
      checkpoint_id: this.makeId(),
      task_id,
      parent_task_id,
      phase,
      workflow,
      state,
      lead,
      helpers,
      mode,
      zone,
      inputs,
      actions,
      artifacts,
      risks,
      next_step,
      created_at: new Date().toISOString(),
    };

    // Load existing list, push, trim, save
    const existing = await MemoryDB.get<Checkpoint[]>(CHECKPOINT_LIST_KEY) ?? [];
    existing.push(cp);
    // Keep only last N checkpoints to bound storage
    const trimmed = existing.slice(-MAX_CHECKPOINTS);
    await MemoryDB.set(CHECKPOINT_LIST_KEY, trimmed);

    // Emit for UI listeners
    eventBus.emit('checkpoint:created', { checkpoint_id: cp.checkpoint_id, phase, task_id });

    // Write to governance report
    void ReportWriter.checkpoint(
      phase,
      task_id,
      lead,
      'SYSTEM',
      `[CheckpointManager] ${phase} checkpoint for task ${task_id} (${workflow}, ${state})`,
      { checkpoint_id: cp.checkpoint_id, workflow, state, zone, artifacts, risks },
    );

    return cp;
  }

  /** Retrieve all checkpoints */
  async list(): Promise<Checkpoint[]> {
    return await MemoryDB.get<Checkpoint[]>(CHECKPOINT_LIST_KEY) ?? [];
  }

  /** Get all checkpoints for a specific task */
  async forTask(task_id: string): Promise<Checkpoint[]> {
    const all = await this.list();
    return all.filter(cp => cp.task_id === task_id);
  }

  /** Get the most recent 'before' checkpoint for crash recovery */
  async latestBefore(task_id: string): Promise<Checkpoint | null> {
    const forTask = await this.forTask(task_id);
    const befores = forTask.filter(cp => cp.phase === 'before');
    return befores.length > 0 ? befores[befores.length - 1] : null;
  }

  /**
   * Recover from a crash: find the last unresolved 'before' checkpoint
   * (tasks where 'after' checkpoint was never written).
   */
  async recover(): Promise<Checkpoint[]> {
    const all = await this.list();
    // Group by task_id
    const byTask = new Map<string, { before?: Checkpoint; after?: Checkpoint }>();
    for (const cp of all) {
      if (!byTask.has(cp.task_id)) byTask.set(cp.task_id, {});
      byTask.get(cp.task_id)![cp.phase] = cp;
    }
    // Tasks with a 'before' but no 'after' are incomplete
    const incomplete: Checkpoint[] = [];
    for (const { before, after } of byTask.values()) {
      if (before && !after) incomplete.push(before);
    }
    return incomplete;
  }

  /** Summarize recent checkpoints for /lee.sitrep and /lee.status */
  async summary(limit = 10): Promise<Array<{ id: string; task_id: string; phase: CheckpointPhase; created_at: string }>> {
    const all = await this.list();
    return all.slice(-limit).reverse().map(cp => ({
      id: cp.checkpoint_id,
      task_id: cp.task_id,
      phase: cp.phase,
      created_at: cp.created_at,
    }));
  }
}

export const CheckpointManager = new CheckpointManagerClass();
