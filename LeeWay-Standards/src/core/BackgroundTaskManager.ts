/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: CORE.SERVICE.BACKGROUND
TAG: CORE.SERVICE.BACKGROUND.TASKMANAGER

COLOR_ONION_HEX:
NEON=#8B5CF6
FLUO=#A78BFA
PASTEL=#DDD6FE

ICON_ASCII:
family=lucide
glyph=zap

5WH:
WHAT = Background task execution manager enabling Agent Lee to work without UI being open
WHY = Allows agents to execute tasks, monitor pages, and report results even when app is minimized to widget
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = core/BackgroundTaskManager.ts
WHEN = 2026
HOW = Static class managing task queue, execution polling, and Firebase persistence

AGENTS:
ASSESS
AUDIT
NOVA
ROUTER

LICENSE:
MIT
*/

import { FirebaseService } from './FirebaseService';
import { AgentRouter } from './AgentRouter';
import { eventBus } from './EventBus';
/** Generate a v4-style UUID without external dependency */
function uuidv4(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export interface BackgroundTask {
  id: string;
  userId: string;
  objective: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  source: 'widget' | 'voice' | 'scheduled' | 'internal';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  result?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export class BackgroundTaskManager {
  private static instance: BackgroundTaskManager;
  private isRunning = false;
  private isExecuting = false; // concurrency guard
  private pollIntervalBusy = 10000;  // 10 seconds when tasks in queue
  private pollIntervalIdle = 30000;  // 30 seconds when idle
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private firebase: FirebaseService;
  private taskQueue: Map<string, BackgroundTask> = new Map();

  private constructor() {
    this.firebase = FirebaseService.getInstance();
    this.setupEventListeners();
  }

  static getInstance(): BackgroundTaskManager {
    if (!BackgroundTaskManager.instance) {
      BackgroundTaskManager.instance = new BackgroundTaskManager();
    }
    return BackgroundTaskManager.instance;
  }

  // ─────────────────────────────────────────────────────────────────────
  // INITIALIZATION & LIFECYCLE
  // ─────────────────────────────────────────────────────────────────────

  private setupEventListeners(): void {
    eventBus.on('backgroundTask:request', async (data: any) => {
      await this.queueTask({
        objective: data.objective,
        userId: data.userId,
        priority: data.priority || 'medium',
        source: data.source || 'internal',
        metadata: data.metadata,
      });
    });

    eventBus.on('firebase:signed-in', async (data: any) => {
      if (data.user) {
        await this.start(data.user.uid);
      }
    });
  }

  /**
   * Start the background task polling loop
   * Call this when user authenticates or app initializes
   */
  async start(userId: string): Promise<void> {
    if (this.isRunning) {
      console.warn('[BackgroundTaskManager] Already running');
      return;
    }

    this.isRunning = true;
    console.log('[BackgroundTaskManager] Started for user:', userId);
    eventBus.emit('backgroundTask:started', { userId });

    // Initial load of pending tasks
    await this.loadPendingTasks(userId);

    // Start smart polling loop
    this.schedulePoll(userId);
  }

  /**
   * Smart poll scheduling: faster when busy, slower when idle
   */
  private schedulePoll(userId: string): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
    const hasWork = this.hasPendingWork(userId);
    const interval = hasWork ? this.pollIntervalBusy : this.pollIntervalIdle;

    this.pollTimer = setInterval(async () => {
      try {
        await this.processPendingTasks(userId);
        // Re-adjust interval based on current state
        const stillHasWork = this.hasPendingWork(userId);
        const currentInterval = stillHasWork ? this.pollIntervalBusy : this.pollIntervalIdle;
        if (currentInterval !== interval) {
          this.schedulePoll(userId); // switch interval
        }
      } catch (error) {
        console.error('[BackgroundTaskManager] Poll error:', error);
        eventBus.emit('backgroundTask:error', { error });
      }
    }, interval);
  }

  private hasPendingWork(userId: string): boolean {
    for (const t of this.taskQueue.values()) {
      if (t.status === 'QUEUED' && t.userId === userId) return true;
    }
    return false;
  }

  /**
   * Stop the background task polling loop
   */
  stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.isRunning = false;
    this.taskQueue.clear();
    console.log('[BackgroundTaskManager] Stopped');
    eventBus.emit('backgroundTask:stopped', {});
  }

  // ─────────────────────────────────────────────────────────────────────
  // TASK QUEUE MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Queue a new task for background execution
   * Can be called from widget, voice, or internal sources
   */
  async queueTask(
    taskData: Partial<BackgroundTask> & { userId: string; objective: string }
  ): Promise<string> {
    const taskId = `bg_${uuidv4()}`;
    const now = new Date().toISOString();

    const task: BackgroundTask = {
      id: taskId,
      userId: taskData.userId,
      objective: taskData.objective,
      priority: taskData.priority || 'medium',
      source: taskData.source || 'internal',
      status: 'QUEUED',
      createdAt: now,
      metadata: taskData.metadata,
    };

    // Add to local queue
    this.taskQueue.set(taskId, task);

    // Persist to Firebase
    try {
      await this.firebase.createTask(taskData.userId, {
        id: taskId,
        agentId: 'AgentLee',
        agentName: 'Agent Lee',
        objective: task.objective,
        status: 'QUEUED',
        executedInBackground: true,
        metadata: {
          source: task.source,
          priority: task.priority,
          ...task.metadata,
        },
      });
    } catch (error) {
      console.error('[BackgroundTaskManager] Failed to persist task:', error);
      eventBus.emit('backgroundTask:error', { error, taskId });
      throw error;
    }

    console.log('[BackgroundTaskManager] Task queued:', taskId);
    eventBus.emit('backgroundTask:queued', { taskId, task });

    return taskId;
  }

  /**
   * Load all pending tasks from Firebase for a user
   */
  private async loadPendingTasks(userId: string): Promise<void> {
    try {
      const tasks = await this.firebase.getUserTasks(userId, undefined, 100);

      // Load only non-completed tasks
      tasks
        .filter((t) => ['QUEUED', 'RUNNING', 'WAITING'].includes(t.status))
        .forEach((t) => {
          this.taskQueue.set(t.id, {
            id: t.id,
            userId: t.userId,
            objective: t.objective,
            priority: 'medium', // TODO: Store in metadata
            source: t.metadata?.source || 'internal',
            status: t.status as any,
            createdAt: t.createdAt,
            startedAt: t.startedAt,
            metadata: t.metadata,
          });
        });

      console.log(`[BackgroundTaskManager] Loaded ${this.taskQueue.size} pending tasks`);
    } catch (error) {
      console.error('[BackgroundTaskManager] Failed to load pending tasks:', error);
    }
  }

  /**
   * Process all pending tasks in the queue
   */
  private async processPendingTasks(userId: string): Promise<void> {
    // Early exit if nothing to do or already executing
    if (this.isExecuting) return;

    const queuedTasks = Array.from(this.taskQueue.values()).filter(
      (t) => t.status === 'QUEUED' && t.userId === userId
    );

    if (queuedTasks.length === 0) {
      // Clean up completed/failed tasks from local cache (keep last 20)
      this.pruneCompletedTasks(20);
      return;
    }

    console.log(`[BackgroundTaskManager] Processing ${queuedTasks.length} queued tasks`);

    // Execute one task at a time (concurrency guard)
    const task = queuedTasks[0];
    this.isExecuting = true;
    try {
      await this.executeTask(task);
    } catch (error) {
      console.error(`[BackgroundTaskManager] Failed to execute task ${task.id}:`, error);
      await this.markTaskFailed(userId, task.id, error instanceof Error ? error.message : String(error));
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * Prune completed/failed tasks from local cache to prevent unbounded growth
   */
  private pruneCompletedTasks(keepCount: number): void {
    const finished = Array.from(this.taskQueue.entries())
      .filter(([, t]) => t.status === 'COMPLETED' || t.status === 'FAILED')
      .sort((a, b) => (a[1].completedAt || '').localeCompare(b[1].completedAt || ''));

    const toRemove = finished.length - keepCount;
    if (toRemove > 0) {
      for (let i = 0; i < toRemove; i++) {
        this.taskQueue.delete(finished[i][0]);
      }
    }
  }

  /**
   * Execute a single background task
   */
  private async executeTask(task: BackgroundTask): Promise<void> {
    const now = new Date().toISOString();

    // Update task status to RUNNING
    task.status = 'RUNNING';
    task.startedAt = now;
    this.taskQueue.set(task.id, task);

    await this.firebase.updateTask(task.userId, task.id, {
      status: 'RUNNING',
      startedAt: now,
    });

    console.log(`[BackgroundTaskManager] Executing task: ${task.id}`);
    eventBus.emit('backgroundTask:started', { taskId: task.id });

    try {
      // Route the task through AgentRouter
      // This allows any agent to handle it, not just AgentLee
      const result = await AgentRouter.runWithBaton(
        task.objective,
        'G1' as any, // Default to general conversation flow
        'AgentLee',
        [],
        'Z0_AGENTVM',
        undefined
      );

      // Mark task as completed
      const completedAt = new Date().toISOString();
      task.status = 'COMPLETED';
      task.completedAt = completedAt;
      task.result = result;
      this.taskQueue.set(task.id, task);

      await this.firebase.updateTask(task.userId, task.id, {
        status: 'COMPLETED',
        completedAt,
        result,
      });

      console.log(`[BackgroundTaskManager] Task completed: ${task.id}`);
      eventBus.emit('backgroundTask:completed', { taskId: task.id, result });

      // Log to memory
      await this.firebase.logMemoryEntry(task.userId, {
        agentId: 'AgentLee',
        agentName: 'Agent Lee',
        action: 'Background Task Completed',
        details: `${task.objective} → ${result.substring(0, 100)}...`,
        impact: 'medium',
        metadata: { taskId: task.id, source: task.source },
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await this.markTaskFailed(task.userId, task.id, errorMsg);
    }
  }

  /**
   * Mark a task as failed
   */
  private async markTaskFailed(userId: string, taskId: string, errorMsg: string): Promise<void> {
    const completedAt = new Date().toISOString();
    const task = this.taskQueue.get(taskId);

    if (task) {
      task.status = 'FAILED';
      task.completedAt = completedAt;
      task.error = errorMsg;
      this.taskQueue.set(taskId, task);
    }

    await this.firebase.updateTask(userId, taskId, {
      status: 'FAILED',
      completedAt,
      result: `Error: ${errorMsg}`,
    });

    console.error(`[BackgroundTaskManager] Task failed: ${taskId} - ${errorMsg}`);
    eventBus.emit('backgroundTask:failed', { taskId, error: errorMsg });

    // Log to memory
    await this.firebase.logMemoryEntry(userId, {
      agentId: 'AgentLee',
      agentName: 'Agent Lee',
      action: 'Background Task Failed',
      details: errorMsg,
      impact: 'high',
      metadata: { taskId },
    });
  }

  // ─────────────────────────────────────────────────────────────────────
  // QUERY METHODS
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Get a specific task from local cache or Firebase
   */
  getTask(taskId: string): BackgroundTask | undefined {
    return this.taskQueue.get(taskId);
  }

  /**
   * Get all tasks in the local queue
   */
  getQueuedTasks(): BackgroundTask[] {
    return Array.from(this.taskQueue.values());
  }

  /**
   * Get status of background manager
   */
  getStatus(): {
    isRunning: boolean;
    queueSize: number;
    tasks: BackgroundTask[];
  } {
    return {
      isRunning: this.isRunning,
      queueSize: this.taskQueue.size,
      tasks: Array.from(this.taskQueue.values()),
    };
  }

  // ─────────────────────────────────────────────────────────────────────
  // CONFIGURATION
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Set the polling interval (in ms)
   */
  setPollInterval(busyMs: number, idleMs?: number): void {
    this.pollIntervalBusy = busyMs;
    if (idleMs) this.pollIntervalIdle = idleMs;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      const currentUser = this.firebase.getCurrentUser();
      if (currentUser) {
        this.schedulePoll(currentUser.uid);
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────

export const backgroundTaskManager = BackgroundTaskManager.getInstance();

export default BackgroundTaskManager;
