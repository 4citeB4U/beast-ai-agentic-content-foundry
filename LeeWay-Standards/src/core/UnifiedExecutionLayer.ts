/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: CORE
TAG: CORE.SDK.UNIFIEDEXECUTIONLAYER.MAIN

COLOR_ONION_HEX:
NEON=#39FF14
FLUO=#0DFF94
PASTEL=#C7FFD8

ICON_ASCII:
family=lucide
glyph=file

5WH:
WHAT = UnifiedExecutionLayer module
WHY = Part of CORE region
WHO = LEEWAY Align Agent
WHERE = core\UnifiedExecutionLayer.ts
WHEN = 2026
HOW = Auto-aligned by LEEWAY align-agent

AGENTS:
ASSESS
ALIGN
AUDIT

LICENSE:
MIT
*/

/**
 * EXECUTION LAYER WITH GOVERNANCE
 * ================================
 * 
 * ALL execution must pass through this layer.
 * NO execution without governance check.
 * 
 * Pipeline:
 *   Agent Lee Decision
 *     ↓
 *   ExecutionLayer.execute()
 *     ↓
 *   Governance Check (enforceGovernance)
 *     ↓
 *   capability gating (zone checks)
 *     ↓
 *   [Approve / Block / Request User Approval]
 *     ↓
 *   Execute Action (speech, file, device)
 *     ↓
 *   Track in TaskGraph
 */

import { CentralGovernance } from './CentralGovernance';
import { TaskGraph } from './TaskGraph';
import { eventBus } from './EventBus';

/**
 * EXECUTION REQUEST
 */
export interface ExecutionRequest {
  agentId: string;
  action: string;              // e.g., 'voice.speak', 'file.write', 'device.control'
  intent: string;              // e.g., 'notify', 'compute', 'record'
  zone: 'Z0' | 'Z1' | 'Z2';   // governance zone
  taskId?: string;
  payload: unknown;            // action-specific data
  priority?: 'low' | 'normal' | 'high' | 'critical';
  metadata?: Record<string, unknown>;
}

/**
 * EXECUTION DECISION
 */
export interface ExecutionDecision {
  approved: boolean;
  reason: string;
  requiresApproval?: boolean;  // If true, show user dialog
  approvalDeadline?: number;   // ms
}

/**
 * EXECUTION RESULT
 */
export interface ExecutionResult {
  success: boolean;
  taskId?: string;
  output?: unknown;
  error?: string;
  latency: number;
}

/**
 * EXECUTION LAYER
 */
export class ExecutionLayer {
  private static instance: ExecutionLayer;
  private governanceEnabled = true;
  private executionMetrics = new Map<string, { count: number; errors: number }>();

  private constructor() {}

  /**
   * GET SINGLETON
   */
  static getInstance(): ExecutionLayer {
    if (!ExecutionLayer.instance) {
      ExecutionLayer.instance = new ExecutionLayer();
    }
    return ExecutionLayer.instance;
  }

  /**
   * EXECUTE ACTION
   * 
   * This is the ONLY entry point for execution.
   * 
   * Flow:
   * 1. Validate request
   * 2. Check governance
   * 3. Get user approval if needed
   * 4. Execute
   * 5. Track result
   * 6. Return result
   */
  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const startTime = Date.now();

    console.log('[ExecutionLayer] Execute request:', {
      agentId: request.agentId,
      action: request.action,
      intent: request.intent,
      zone: request.zone
    });

    try {
      // 1. VALIDATE REQUEST
      this.validateRequest(request);

      // 2. GOVERNANCE CHECK
      const governanceDecision = await this.checkGovernance(request);

      if (!governanceDecision.approved) {
        console.warn('[ExecutionLayer] Execution blocked by governance:', governanceDecision.reason);

        eventBus.emit('execution:blocked' as any, {
          agentId: request.agentId,
          action: request.action,
          reason: governanceDecision.reason,
          requiresApproval: governanceDecision.requiresApproval
        });

        // If requires approval, show dialog (would be handled by UI)
        if (governanceDecision.requiresApproval) {
          eventBus.emit('governance:approval-required' as any, {
            request,
            deadline: governanceDecision.approvalDeadline
          });
        }

        return {
          success: false,
          error: governanceDecision.reason,
          latency: Date.now() - startTime
        };
      }

      // 3. CREATE TASK ENTRY (if not already created)
      let taskId: string | undefined = request.taskId;
      if (!taskId) {
        const task = TaskGraph.add(
          request.intent,                    // objective
          'G1',                              // workflow (use G1 for execution)
          request.agentId,                   // lead
          [],                                // helpers
          'Z0_AGENTVM',                      // zone (map from request.zone)
          'low',                             // risk (use 'low', 'med', 'high')
          []                                 // dependencies
        );
        taskId = task.task_id;
      }

      // 4. EXECUTE ACTION
      let output: unknown;

      switch (request.action) {
        case 'voice.speak':
          output = await this.executeVoiceSpeak(request.payload);
          break;

        case 'file.write':
          output = await this.executeFileWrite(request.payload);
          break;

        case 'file.read':
          output = await this.executeFileRead(request.payload);
          break;

        case 'device.control':
          output = await this.executeDeviceControl(request.payload);
          break;

        case 'api.call':
          output = await this.executeApiCall(request.payload);
          break;

        case 'log.event':
          output = await this.executeLogEvent(request.payload);
          break;

        default:
          throw new Error(`Unknown action: ${request.action}`);
      }

      // 5. TRACK SUCCESS
      if (taskId) {
        TaskGraph.complete(taskId, []);
      }

      // 6. RECORD METRICS
      this.recordExecution(request.action, true);

      // 7. EMIT SUCCESS EVENT
      eventBus.emit('agent:done' as any, {
        agent: request.agentId,
        task: request.intent
      });

      const latency = Date.now() - startTime;

      console.log('[ExecutionLayer] Execution succeeded:', {
        action: request.action,
        latency: `${latency}ms`,
        output
      });

      return {
        success: true,
        taskId,
        output,
        latency
      };

    } catch (error) {
      // HANDLE ERROR
      console.error('[ExecutionLayer] Execution failed:', error);

      if (request.taskId) {
        TaskGraph.fail(request.taskId, `execution_error: ${String(error)}`);
      }

      this.recordExecution(request.action, false);

      eventBus.emit('agent:error' as any, {
        agent: request.agentId,
        error: String(error)
      });

      return {
        success: false,
        error: String(error),
        latency: Date.now() - startTime
      };
    }
  }

  /**
   * CHECK GOVERNANCE
   * 
   * This calls CentralGovernance to validate the request.
   */
  private async checkGovernance(request: ExecutionRequest): Promise<ExecutionDecision> {
    if (!this.governanceEnabled) {
      return { approved: true, reason: 'governance_disabled' };
    }

    try {
      // Build governance intent block
      const writeIntentBlock = CentralGovernance.buildWriteIntentBlock({
        agentId: request.agentId,
        intent: request.intent,
        action: request.action,
        zone: request.zone
      });

      // Check if allowed
      const isAllowed = await CentralGovernance.enforceGovernance(writeIntentBlock);

      if (!isAllowed) {
        return {
          approved: false,
          reason: `Intent '${request.intent}' not allowed for agent '${request.agentId}' in zone '${request.zone}'`,
          requiresApproval: true,
          approvalDeadline: Date.now() + 30000 // 30s window
        };
      }

      // Check capability gating
      const capCheck = CentralGovernance.checkCapabilityGate(request.action, request.zone);

      if (!capCheck) {
        return {
          approved: false,
          reason: `Capability '${request.action}' not available in zone '${request.zone}'`,
          requiresApproval: false
        };
      }

      return { approved: true, reason: 'passed_governance' };

    } catch (error) {
      console.error('[ExecutionLayer] Governance check error:', error);
      return {
        approved: false,
        reason: `Governance check failed: ${String(error)}`,
        requiresApproval: false
      };
    }
  }

  /**
   * VALIDATE REQUEST
   */
  private validateRequest(request: ExecutionRequest): void {
    if (!request.agentId) throw new Error('agentId required');
    if (!request.action) throw new Error('action required');
    if (!request.intent) throw new Error('intent required');
    if (!request.zone) throw new Error('zone required');
    if (!request.payload) throw new Error('payload required');
  }

  /**
   * ACTION EXECUTORS
   */

  private async executeVoiceSpeak(payload: any): Promise<string> {
    const { text, voice, speed } = payload;

    if (!text) throw new Error('text required for voice.speak');

    console.log('[ExecutionLayer] Speaking:', text);

    // Emit to UI/voice system
    eventBus.emit('tts:speak' as any, {
      text,
      voice: voice || 'default',
      speed: speed || 1.0
    });

    return `Speaking: ${text}`;
  }

  private async executeFileWrite(payload: any): Promise<string> {
    const { path, content } = payload;

    if (!path || !content) throw new Error('path and content required for file.write');

    console.log('[ExecutionLayer] Writing file:', path);

    // This would call actual file system API
    // For now, just log it
    eventBus.emit('file:wrote' as any, { path, size: String(content).length });

    return `Wrote ${String(content).length} bytes to ${path}`;
  }

  private async executeFileRead(payload: any): Promise<string> {
    const { path } = payload;

    if (!path) throw new Error('path required for file.read');

    console.log('[ExecutionLayer] Reading file:', path);

    // Call file system API
    eventBus.emit('file:read' as any, { path });

    return `Read from ${path}`;
  }

  private async executeDeviceControl(payload: any): Promise<string> {
    const { device, action, params } = payload;

    if (!device || !action) throw new Error('device and action required for device.control');

    console.log('[ExecutionLayer] Device control:', { device, action, params });

    eventBus.emit('device:control' as any, { device, action, params });

    return `Device ${device} executed ${action}`;
  }

  private async executeApiCall(payload: any): Promise<unknown> {
    const { endpoint, method, body } = payload;

    if (!endpoint) throw new Error('endpoint required for api.call');

    console.log('[ExecutionLayer] API call:', { endpoint, method });

    const response = await fetch(endpoint, {
      method: method || 'GET',
      body: body ? JSON.stringify(body) : undefined,
      headers: { 'Content-Type': 'application/json' }
    });

    return await response.json();
  }

  private async executeLogEvent(payload: any): Promise<string> {
    const { event, data } = payload;

    if (!event) throw new Error('event required for log.event');

    console.log('[ExecutionLayer] Logging event:', event, data);

    eventBus.emit('system:logged' as any, { event, data, timestamp: Date.now() });

    return `Logged event: ${event}`;
  }

  /**
   * METRICS
   */
  private recordExecution(action: string, success: boolean): void {
    const stat = this.executionMetrics.get(action) || { count: 0, errors: 0 };
    stat.count++;
    if (!success) stat.errors++;
    this.executionMetrics.set(action, stat);
  }

  /**
   * GET EXECUTION STATS
   */
  getStats(): {
    action: string;
    count: number;
    errors: number;
    successRate: number;
  }[] {
    return Array.from(this.executionMetrics.entries()).map(([action, stat]) => ({
      action,
      count: stat.count,
      errors: stat.errors,
      successRate: stat.count > 0 ? ((stat.count - stat.errors) / stat.count) * 100 : 100
    }));
  }

  /**
   * ENABLE/DISABLE GOVERNANCE
   */
  setGovernanceEnabled(enabled: boolean): void {
    this.governanceEnabled = enabled;
    console.log('[ExecutionLayer] Governance', enabled ? 'enabled' : 'disabled');
  }
}

// Export singleton
export const executionLayer = ExecutionLayer.getInstance();
