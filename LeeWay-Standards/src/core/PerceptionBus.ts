/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: CORE
TAG: CORE.SDK.PERCEPTIONBUS.MAIN

COLOR_ONION_HEX:
NEON=#39FF14
FLUO=#0DFF94
PASTEL=#C7FFD8

ICON_ASCII:
family=lucide
glyph=file

5WH:
WHAT = PerceptionBus module
WHY = Part of CORE region
WHO = LEEWAY Align Agent
WHERE = core\PerceptionBus.ts
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
 * PERCEPTION BUS
 * ===============
 * Central event hub for parallel voice + vision streams.
 * 
 * Architecture:
 *   Voice Stream ─┐
 *                ├──► Agent Lee Core ───► Execution
 *   Vision Stream ┘
 * 
 * ALL perception events flow through this single bus.
 * NO direct voice→Agent Lee, NO direct vision→Agent Lee bypass.
 * 
 * Guarantees:
 * - Single source of truth for perception state
 * - Full traceability (every event tagged with timestamp + source)
 * - Zero duplication (event fires once, all subscribers notified)
 * - Non-blocking (subscribers called async, no exception propagation)
 */

// Union type for all valid perception payloads
export type PerceptionPayload = VoicePayload | VisionPayload | HybridPayload | StudioWorkflowPayload;

export interface PerceptionEvent {
  id: string;                          // Unique event ID for tracing
  type: 'voice' | 'vision' | 'hybrid' | 'SECURITY_BLOCK' | 'studio_workflow'; // Event classification
  source: string;                      // Who published (VoiceSession, CameraCapture, UIOverlay)
  timestamp: number;                   // Event time (Date.now())
  latency?: {
    captured?: number;                 // Time data was captured
    encoded?: number;                  // Time data was encoded
    published?: number;                // Time published to bus
  };
  payload: PerceptionPayload | SecurityBlockPayload;
}

export interface StudioWorkflowPayload {
  region: string;
  phase: string;
  color: string;
}

export interface SecurityBlockPayload {
  reason: string;
  offendingText: string;
  originalEvent: PerceptionEvent;
}

export interface VoicePayload {
  kind: 'voice';
  state: 'listening' | 'processing' | 'speaking' | 'idle' | 'error';
  transcript?: string;                 // Partial or final transcription
  confidence?: number;                 // STT confidence (0-1)
  isFinal?: boolean;                   // true = final transcript, false = partial
  audio?: {
    format: 'pcm16';
    sampleRate: number;
    duration: number;                  // ms
    energy?: number;                   // RMS value for volume detection
  };
  originalLanguage?: string;
  metadata?: Record<string, unknown>;
}

export interface VisionPayload {
  kind: 'vision';
  state: 'capturing' | 'processing' | 'idle' | 'error';
  frame?: {
    width: number;
    height: number;
    rotation: 0 | 90 | 180 | 270;
    format: 'rgba' | 'yuv';
  };
  detections?: VisionDetection[];
  sceneDescription?: string;
  metadata?: Record<string, unknown>;
}

export interface VisionDetection {
  type: 'face' | 'object' | 'text' | 'gesture' | 'scene';
  label: string;
  confidence: number;
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  metadata?: Record<string, unknown>;
}

export interface HybridPayload {
  kind: 'hybrid';
  voice: VoicePayload;
  vision: VisionPayload;
  correlation?: {
    voiceRelatesTo?: VisionDetection[];   // Which vision detections correlate to voice
    visionRelatesTo?: string;             // Which part of transcript relates to vision
  };
}

/**
 * Subscriber function signature
 */
export type PerceptionSubscriber = (event: PerceptionEvent) => Promise<void> | void;

/**
 * SINGLETON EVENT BUS
 */
export class PerceptionBus {
  private static instance: PerceptionBus;
  private subscribers: Map<string, PerceptionSubscriber[]> = new Map();
  private eventHistory: PerceptionEvent[] = [];
  private maxHistorySize = 200;
  private publisherMetrics = new Map<string, { count: number; lastTime: number }>();

  private constructor() {
    this.initializeEventTypes();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): PerceptionBus {
    if (!PerceptionBus.instance) {
      PerceptionBus.instance = new PerceptionBus();
    }
    return PerceptionBus.instance;
  }

  /**
   * Initialize subscriber lists for all event types
   */
  private initializeEventTypes(): void {
    ['voice', 'vision', 'hybrid'].forEach(type => {
      this.subscribers.set(type, []);
    });
    this.subscribers.set('*', []); // Wildcard subscribers
  }

  /**
   * PUBLISH EVENT
   * 
   * Flow:
   * 1. Validate event structure
   * 2. Add to history (with truncation)
   * 3. Call all subscribers async (non-blocking)
   * 4. Track metrics
   * 5. Log if enabled
   */
  async publish(event: PerceptionEvent): Promise<void> {
    // Validate
    if (!event.id) event.id = this.generateEventId();
    if (!event.timestamp) event.timestamp = Date.now();
    if (!event.source) throw new Error('Event must have source');
    if (!event.payload) throw new Error('Event must have payload');

    // Add latency marker
    if (!event.latency) event.latency = {};
    event.latency.published = Date.now();

    // Store lightweight copy in history (strip heavy payloads)
    const lightEvent: PerceptionEvent = {
      id: event.id,
      type: event.type,
      source: event.source,
      timestamp: event.timestamp,
      latency: event.latency,
      payload: this.stripHeavyPayload(event.payload),
    };
    this.eventHistory.push(lightEvent);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Track metrics
    const key = `${event.source}:${event.type}`;
    const existing = this.publisherMetrics.get(key) || { count: 0, lastTime: 0 };
    existing.count++;
    existing.lastTime = Date.now();
    this.publisherMetrics.set(key, existing);

    // Notify subscribers (async, non-blocking)
    this.notifySubscribers(event);
  }

  /**
   * SUBSCRIBE TO EVENTS
   * 
   * Usage:
   *   PerceptionBus.getInstance().subscribe('voice', async (event) => { ... })
   *   PerceptionBus.getInstance().subscribe('*', async (event) => { ... })
   */
  subscribe(
    eventType: 'voice' | 'vision' | 'hybrid' | '*',
    subscriber: PerceptionSubscriber
  ): { unsubscribe: () => void } {
    const subs = this.subscribers.get(eventType) || [];
    subs.push(subscriber);
    this.subscribers.set(eventType, subs);

    // Return unsubscribe function
    return {
      unsubscribe: () => {
        const index = subs.indexOf(subscriber);
        if (index > -1) subs.splice(index, 1);
      }
    };
  }

  /**
   * INTERNAL: Notify all subscribers
   */
  private async notifySubscribers(event: PerceptionEvent): Promise<void> {
    const listeners: PerceptionSubscriber[] = [];

    // Get type-specific subscribers
    const typeSubs = this.subscribers.get(event.type) || [];
    listeners.push(...typeSubs);

    // Get wildcard subscribers
    const wildcardSubs = this.subscribers.get('*') || [];
    listeners.push(...wildcardSubs);

    // Call all async (fire-and-forget; don't block on errors)
    listeners.forEach(subscriber => {
      try {
        Promise.resolve(subscriber(event)).catch(err => {
          console.error(`[PerceptionBus] Subscriber error:`, err);
        });
      } catch (err) {
        console.error(`[PerceptionBus] Subscriber sync error:`, err);
      }
    });
  }

  /**
   * QUERY: Get recent events
   */
  getRecentEvents(type?: string, limit: number = 100): PerceptionEvent[] {
    const result: PerceptionEvent[] = [];
    // Iterate in reverse to get most recent first, then reverse result
    for (let i = this.eventHistory.length - 1; i >= 0 && result.length < limit; i--) {
      const e = this.eventHistory[i];
      if (!type || type === '*' || e.type === type) {
        result.push(e);
      }
    }
    return result.reverse();
  }

  /**
   * QUERY: Get last event of type
   */
  getLastEvent(type: 'voice' | 'vision' | 'hybrid' | '*' = '*'): PerceptionEvent | null {
    const events = this.getRecentEvents(type === '*' ? undefined : type, 1);
    return events.length > 0 ? events[0] : null;
  }

  /**
   * METRICS: Get publisher stats
   */
  getPublisherMetrics(): {
    publisher: string;
    eventCount: number;
    lastPublished: number;
    rate: number;
  }[] {
    const now = Date.now();
    return Array.from(this.publisherMetrics.entries()).map(([publisher, stats]) => ({
      publisher,
      eventCount: stats.count,
      lastPublished: stats.lastTime,
      rate: stats.lastTime > 0 ? stats.count / ((now - stats.lastTime) / 1000) : 0
    }));
  }

  /**
   * DIAGNOSTIC: Get bus health
   */
  getHealth(): {
    uptime: number;
    eventCount: number;
    subscriberCount: number;
    currentRate: number;
  } {
    const metrics = this.getPublisherMetrics();
    const avgRate = metrics.length > 0 ? metrics.reduce((sum, m) => sum + m.rate, 0) / metrics.length : 0;

    return {
      uptime: Date.now(),
      eventCount: this.eventHistory.length,
      subscriberCount: Array.from(this.subscribers.values()).reduce((sum, subs) => sum + subs.length, 0),
      currentRate: avgRate
    };
  }

  /**
   * UTILITY: Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * UTILITY: Strip heavy data from payloads for history storage
   * Keeps metadata but removes raw audio/video frames
   */
  private stripHeavyPayload(payload: PerceptionPayload | SecurityBlockPayload): PerceptionPayload | SecurityBlockPayload {
    if ('kind' in payload) {
      if (payload.kind === 'voice') {
        // Keep transcript/state/confidence, strip raw audio
        const { audio, ...rest } = payload as VoicePayload;
        return rest as VoicePayload;
      }
      if (payload.kind === 'vision') {
        // Keep detections/scene, strip raw frame data
        const { frame, ...rest } = payload as VisionPayload;
        return rest as VisionPayload;
      }
    }
    return payload;
  }

  /**
   * DEBUG: Clear history
   */
  clearHistory(): void {
    this.eventHistory = [];
    this.publisherMetrics.clear();
  }
}

// Export singleton instance for convenience
export const perceptionBus = PerceptionBus.getInstance();
