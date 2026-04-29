/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: CORE
TAG: CORE.SDK.AGENTORCHESTRATIONPIPELINE.MAIN

COLOR_ONION_HEX:
NEON=#39FF14
FLUO=#0DFF94
PASTEL=#C7FFD8

ICON_ASCII:
family=lucide
glyph=file

5WH:
WHAT = AgentOrchestrationPipeline module
WHY = Part of CORE region
WHO = LEEWAY Align Agent
WHERE = core\AgentOrchestrationPipeline.ts
WHEN = 2026
HOW = Auto-aligned by LEEWAY align-agent

AGENTS:
ASSESS
ALIGN
AUDIT

LICENSE:
MIT
*/



import { PerceptionBus, PerceptionEvent, PerceptionPayload } from './PerceptionBus';
import { AgentLee } from '../agents/AgentLee';
import { CentralGovernance } from './CentralGovernance';
import { AgentRouter } from './AgentRouter';
import { eventBus } from './EventBus';
import { VoiceService } from './VoiceService';
// import { AgentLeePersonaPolicy } from './AgentLeePersonaPolicy';
// import { AgentLeeSpeechShaper } from './AgentLeeSpeechShaper';
// import { AgentLeeTurnManager } from './AgentLeeTurnManager';
// TODO: Replace with actual config import if/when available
const leewayVoiceCustom = { allowPoetic: false, masculine: true, precise: true };

/**
 * PIPELINE STATE
 */
export interface PipelineContext {
  agentId: 'agent_lee';
  workflow: 'VOICE' | 'TEXT' | 'VISION' | 'HYBRID';
  intent: string;
  action: string;
  timestamp: number;
  perceprionEventId?: string;
  interruption?: boolean;
  governanceCheck?: {
    passed: boolean;
    reason?: string;
    requiresApproval?: boolean;
  };
  executionResult?: unknown;
  metadata?: Record<string, unknown>;
}

/**
 * PARALLEL ORCHESTRATION ENGINE
 */
export class AgentOrchestrationPipeline {
  private static instance: AgentOrchestrationPipeline;
  private perceptionBus: PerceptionBus;
  private isProcessing = false;
  private lastVoiceEvent: PerceptionEvent | null = null;
  private lastVisionEvent: PerceptionEvent | null = null;
  private activeContext: PipelineContext | null = null;
  private processingQueue: PerceptionEvent[] = [];
  private perceptionSubscriptionsInitialized = false;

  private constructor() {
    this.perceptionBus = PerceptionBus.getInstance();
  }

  /**
   * GET SINGLETON
   */
  static getInstance(): AgentOrchestrationPipeline {
    if (!AgentOrchestrationPipeline.instance) {
      AgentOrchestrationPipeline.instance = new AgentOrchestrationPipeline();
    }
    return AgentOrchestrationPipeline.instance;
  }

  /**
   * INITIALIZE PIPELINE
   * 
   * Wires up all subscriptions to PerceptionBus.
   * Must be called once on app startup.
   */
  async initialize(options: { enablePerception?: boolean } = {}): Promise<void> {
    console.log('[AgentOrchestrationPipeline] Initializing...');
    const { enablePerception = true } = options;

    if (enablePerception) {
      this.enablePerceptionSubscriptions();
    } else {
      console.log('[AgentOrchestrationPipeline] Perception subscriptions deferred (on-demand)');
    }

    console.log('[AgentOrchestrationPipeline] Ready for parallel perceptions');
  }

  enablePerceptionSubscriptions(): void {
    if (this.perceptionSubscriptionsInitialized) {
      return;
    }

    // Subscribe to voice events
    this.perceptionBus.subscribe('voice', async (event) => {
      await this.onVoiceEvent(event);
    });

    // Subscribe to vision events
    this.perceptionBus.subscribe('vision', async (event) => {
      await this.onVisionEvent(event);
    });

    // Subscribe to hybrid events (both voice + vision)
    this.perceptionBus.subscribe('hybrid', async (event) => {
      await this.onHybridEvent(event);
    });

    this.perceptionSubscriptionsInitialized = true;
    console.log('[AgentOrchestrationPipeline] Perception subscriptions active');
  }

  /**
   * VOICE EVENT HANDLER
   * 
   * Triggered when:
   * - New microphone input captured
   * - Speech detected
   * - STT partial/final transcript ready
   * - Interruption detected
   */
  private async onVoiceEvent(event: PerceptionEvent): Promise<void> {
    if (!('kind' in event.payload) || (event.payload as any).kind !== 'voice') return;

    this.lastVoiceEvent = event;

    // Capture state
    const voicePayload = event.payload as any; // VoicePayload

    // Only process on final transcript (not partial)
    if (voicePayload.state === 'listening') {
      // Emit listening state to UI
      eventBus.emit('perception:voice-listening' as any, {
        timestamp: event.timestamp,
        transcript: voicePayload.transcript
      });
      return;
    }

    if (!voicePayload.isFinal || !voicePayload.transcript) {
      return;
    }

    console.log('[AgentOrchestrationPipeline] Voice input received:', voicePayload.transcript);

    // ROUTE TO AGENT LEE
    await this.processVoiceInput(voicePayload.transcript, event);
  }

  /**
   * VISION EVENT HANDLER
   * 
   * Triggered when:
   * - New camera frame captured
   * - Object/face/gesture detected
   * - Scene understanding complete
   */
  private async onVisionEvent(event: PerceptionEvent): Promise<void> {
    if (!('kind' in event.payload) || (event.payload as any).kind !== 'vision') return;

    this.lastVisionEvent = event;

    const visionPayload = event.payload as any; // VisionPayload

    if (visionPayload.state === 'idle') return;

    console.log('[AgentOrchestrationPipeline] Vision event:', visionPayload.detections?.length || 0, 'detections');

    // EMIT VISION UPDATE TO UI
    eventBus.emit('perception:vision-update' as any, {
      timestamp: event.timestamp,
      detections: visionPayload.detections,
      sceneDescription: visionPayload.sceneDescription
    });

    // If we have current voice context, augment it with vision
    if (this.activeContext?.workflow === 'VOICE' || this.activeContext?.workflow === 'HYBRID') {
      console.log('[AgentOrchestrationPipeline] Augmenting voice context with vision');
      // Vision can influence ongoing agent decision (e.g., "point at the button" + camera sees button)
      // This is handled by Agent Lee's multimodal reasoning
    }
  }

  /**
   * HYBRID EVENT HANDLER
   * 
   * When voice + vision arrive correlated
   */
  private async onHybridEvent(event: PerceptionEvent): Promise<void> {
    if (!('kind' in event.payload) || (event.payload as any).kind !== 'hybrid') return;

    const hybridPayload = event.payload as any; // HybridPayload

    console.log('[AgentOrchestrationPipeline] Hybrid event (voice + vision)');

    // Route to voice handler with vision context
    if (hybridPayload.voice.isFinal && hybridPayload.voice.transcript) {
      await this.processVoiceInput(hybridPayload.voice.transcript, event);
    }
  }

  /**
   * PROCESS VOICE INPUT
   * 
   * Pipeline:
   * 1. Create context + track in TaskGraph
   * 2. Route through AgentRouter (intent classification)
   * 3. Send to Agent Lee for decision
   * 4. Governance validation
   * 5. Execute
   * 6. Track completion
   */
  private async processVoiceInput(
    transcript: string,
    event: PerceptionEvent
  ): Promise<void> {
    if (this.isProcessing) {
      console.log('[AgentOrchestrationPipeline] Already processing; queuing voice');
      this.processingQueue.push(event);
      return;
    }

    this.isProcessing = true;

    try {
      // 1. CREATE CONTEXT
      const context: PipelineContext = {
        agentId: 'agent_lee',
        workflow: 'VOICE',
        intent: '',
        action: '',
        timestamp: event.timestamp,
        perceprionEventId: event.id,
        metadata: {
          input: transcript,
          confidence: (event.payload as any).confidence
        }
      };

      this.activeContext = context;

      // 2. EMIT PERCEPTION EVENT
      eventBus.emit('perception:voice-final' as any, {
        transcript,
        confidence: (event.payload as any).confidence
      });

      // 3. CLASSIFY INTENT (via AgentRouter)
      console.log('[AgentOrchestrationPipeline] Classifying intent...');
      const classification = await AgentRouter.classify(transcript);
      context.intent = (classification as any).intent || (classification as any).task || 'chat';
      context.action = (classification as any).action || 'respond';

      if ((classification as any).agent && (classification as any).agent !== 'agent_lee') {
        console.log('[AgentOrchestrationPipeline] Delegating to', (classification as any).agent);
        // Could delegate to specialized agent here
        // For now, all routes to Agent Lee
      }

      // 4. CREATE TASK ENTRY (taskId tracking via EventBus)
      const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // 5. GOVERNANCE CHECK
      console.log('[AgentOrchestrationPipeline] Checking governance...');
      const governanceCheck = await this.enforceGovernance(context);

      if (!governanceCheck.passed) {
        console.log('[AgentOrchestrationPipeline] Governance blocked:', governanceCheck.reason);
        context.governanceCheck = governanceCheck;
        eventBus.emit('agent:error' as any, {
          agent: 'agent_lee',
          error: governanceCheck.reason
        });
        return;
      }

      context.governanceCheck = governanceCheck;

      // 6. EXECUTE: deterministic Agent Lee route only (no model tool branch).
      console.log('[AgentOrchestrationPipeline] Sending to Agent Lee for response...');
      await this.executeWithAgentLee(transcript, context);
      eventBus.emit('agent:done' as any, {
        agent: 'agent_lee',
        task: context.intent
      });

    } catch (error) {
      console.error('[AgentOrchestrationPipeline] Error processing voice:', error);
      eventBus.emit('agent:error' as any, {
        agent: 'agent_lee',
        error: String(error)
      });
    } finally {
      this.isProcessing = false;
      this.activeContext = null;

      // Process queued events
      if (this.processingQueue.length > 0) {
        const next = this.processingQueue.shift();
        if (next && 'kind' in next.payload && (next.payload as any).kind === 'voice') {
          const voicePayload = next.payload as any;
          await this.processVoiceInput(voicePayload.transcript, next);
        }
      }
    }
  }

  /**
   * EXECUTE WITH AGENT LEE
   * 
   * Streams response from Agent Lee, speaks via TTS
   */
  private async executeWithAgentLee(
    transcript: string,
    context: PipelineContext
  ): Promise<void> {
    eventBus.emit('agent:thinking' as any, {
      message: 'Processing your request...'
    });

    // Turn manager: set to processing
    // TODO: AgentLeeTurnManager missing; replace with stub
    const turnManager = {
      setState: (state: string) => {},
      isInterrupted: () => false
    };
    turnManager.setState('processing');

    try {
      // Get Agent Lee response (streaming)
      const response = await AgentLee.respond(transcript, {
        task: context.intent,
        style: 'normal'
      } as any);

      context.executionResult = response;

      // Persona shaping (AFTER governance, BEFORE speech output)
      // TODO: AgentLeePersonaPolicy and AgentLeeSpeechShaper missing; replace with stubs
      const personaResult = {
        shapedText: response,
        persona: {},
        poetic: false,
        summary: '',
        confirmationRequired: false
      };
      const speechShape = {
        chunks: [personaResult.shapedText]
      };

      // Turn manager: set to speaking
      turnManager.setState('speaking');

      // Speak each chunk (simulate interruption-safe chunking)
      for (const chunk of speechShape.chunks) {
        eventBus.emit('agent:speaking' as any, {
          message: chunk
        });

        // Trigger actual TTS
        await VoiceService.speak({ text: chunk });

        // In a real system, check for interruption here and break if needed
        if (turnManager.isInterrupted()) {
          turnManager.setState('interrupted');
          VoiceService.stop();
          break;
        }
      }

      // If confirmation required, emit event
      if (personaResult.confirmationRequired) {
        eventBus.emit('agent:confirmation-required' as any, {
          agent: 'agent_lee',
          message: 'Confirmation required for high-risk action.'
        });
      }

      turnManager.setState('listening');

    } catch (error) {
      console.error('[AgentOrchestrationPipeline] Agent Lee error:', error);
      eventBus.emit('agent:error' as any, {
        agent: 'agent_lee',
        error: String(error)
      });
      throw error;
    }
  }

  /**
   * GOVERNANCE ENFORCEMENT
   * 
   * Check:
   * - Is this action allowed?
   * - Does it require user approval?
   * - Is it within budget/quota?
   */
  private async enforceGovernance(
    context: PipelineContext
  ): Promise<{ passed: boolean; reason?: string; requiresApproval?: boolean }> {
    try {
      // Check governance rules
      const intentBlock = CentralGovernance.buildWriteIntentBlock({
        agentId: context.agentId,
        intent: context.intent,
        action: context.action,
        zone: 'Z1'
      });

      // Validate
      const isAllowed = await CentralGovernance.enforceGovernance(intentBlock);

      if (!isAllowed) {
        return {
          passed: false,
          reason: `Intent '${context.intent}' not allowed for agent '${context.agentId}'`,
          requiresApproval: true
        };
      }

      return {
        passed: true
      };

    } catch (error) {
      console.error('[AgentOrchestrationPipeline] Governance check failed:', error);
      return {
        passed: false,
        reason: String(error)
      };
    }
  }

  /**
   * GET PIPELINE STATE
   */
  getState(): {
    isProcessing: boolean;
    activeContext: PipelineContext | null;
    lastVoice: PerceptionEvent | null;
    lastVision: PerceptionEvent | null;
    queuedEvents: number;
  } {
    return {
      isProcessing: this.isProcessing,
      activeContext: this.activeContext,
      lastVoice: this.lastVoiceEvent,
      lastVision: this.lastVisionEvent,
      queuedEvents: this.processingQueue.length
    };
  }

  /**
   * INTERRUPT ACTIVE TASK
   * 
   * Used for barge-in (user speaks while agent speaking)
   */
  async interrupt(): Promise<void> {
    if (!this.activeContext) return;

    console.log('[AgentOrchestrationPipeline] Interrupting active processing');

    this.activeContext.interruption = true;

    eventBus.emit('agent:interrupted' as any, {
      agent: 'agent_lee'
    });

    // Signal perception layer to reset
    eventBus.emit('perception:interrupt' as any, {
      timestamp: Date.now()
    });
  }
}

// Export singleton
export const agentOrchestrationPipeline = AgentOrchestrationPipeline.getInstance();
