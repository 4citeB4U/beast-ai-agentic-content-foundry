/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: CORE
TAG: CORE.SDK.EVENTBUS.MAIN

COLOR_ONION_HEX:
NEON=#39FF14
FLUO=#0DFF94
PASTEL=#C7FFD8

ICON_ASCII:
family=lucide
glyph=file

5WH:
WHAT = EventBus module
WHY = Part of CORE region
WHO = LEEWAY Align Agent
WHERE = core\EventBus.ts
WHEN = 2026
HOW = Auto-aligned by LEEWAY align-agent

AGENTS:
ASSESS
ALIGN
AUDIT

LICENSE:
MIT
*/

// Leeway header removed per standards compliance
// EventMap type for the EventBus
type EventMap = {
  'breakglass:activated': { caps: string[]; ttl_ms: number; scope: string; reason: string };
  'breakglass:ended': {};
  'shield:threat': { module: string; severity: 'low' | 'medium' | 'high' | 'critical'; detail: string };
  'brain:budget_changed': { mode: string; maxActiveAgents: number; writePolicy: string };
  'report:written': { key: string; event: import('./ReportWriter').ReportEvent };
  'navigate:page': { page: string };
  'verification:start': { mission_id: string; workflows: string[] };
  'verification:result': { mission_id: string; verdict: import('./VerificationCorps').GovernanceVerdict; scenarios: import('./VerificationCorps').ScenarioResult[] };
  'standards:compliance': { score: number; violations: number; total_files: number; recommendation: string };
  'conductor:state': { state: 'idle' | 'listening' | 'thinking' | 'speaking'; sessionId: string };
  'stt:partial': { text: string; confidence: number };
  'stt:speech_start': {};
  'stt:speech_end': { durationMs: number };
  'tts:speaking': { text: string; prosody: { pace: string; pitch: string; emotion: string } };
  'tts:done': { durationMs: number };
  'tts:cancelled': { reason: 'barge_in' | 'interrupt' };
  'vision:screen_text': { text: string; confidence: number };
  'vision:scene_summary': { summary: string };
  'vision:ui_hints': { hints: string[] };
  'router:intent': { intent: string; mode: 'local' | 'leeway'; confidence: number; reason: string };
  'redaction:applied': { originalLength: number; redactedLength: number; categories: string[] };
  'file:event': import('./fileOps').FileEvent;
  'governance:file_operation': import('./governanceEnforcer').FileGovernanceLog;
  // Firebase service events
  'firebase:auth-change': { user: any };
  'firebase:signed-in': { user: any };
  'firebase:auth-error': { error: any };
  'firebase:message-saved': { conversationId: string; messageId: string };
  'firebase:db-error': { operation: string; error?: any; path?: string };
  'firebase:task-created': { taskId: string; userId: string };
  'firebase:task-updated': { taskId: string; userId: string };
  'firebase:memory-logged': { entryId: string; userId: string };
  'firebase:agent-state-saved': { userId: string; agentId: string };
  'firebase:doc-set': { path: string };
  'firebase:doc-deleted': { path: string };
  'firebase:batch-completed': {};
  // Background task events
  'backgroundTask:request': { objective: string; userId: string; priority?: string; metadata?: any };
  'backgroundTask:started': { userId?: string; taskId?: string };
  'backgroundTask:stopped': {};
  'backgroundTask:error': { error: any; taskId?: string };
  'backgroundTask:queued': { taskId: string; task: any };
  'backgroundTask:completed': { taskId: string; result: string };
  'backgroundTask:failed': { taskId: string; error: string };
  // Widget and microphone events
  'widget:command': { id: string; type: string; text: string; userId: string; priority?: string; context?: any };
  'widget:message': { message: string; userId: string; timestamp: string; source?: string };
  'widget:command-queued': { commandId: string; taskId: string };
  'widget:command-error': { commandId: string; error: any };
  'widget:message-queued': { taskId: string };
  'widget:message-error': { error: any };
  'mic:session-started': { sessionId: string };
  'mic:audio-stream-ready': { sessionId: string };
  'mic:error': { sessionId: string; error: any };
  'mic:session-ended': { sessionId: string };
  // LeeWay-RTC events
  'leeway-rtc:connected': {};
  'leeway-rtc:disconnected': {};
  'leeway-rtc:state-change': { state: any };
  'leeway-rtc:error': { error: any };
  'leeway-rtc:listening': {};
  'leeway-rtc:speaking': { text: string };
  'leeway-rtc:user-said': { text: string };
  'leeway-rtc:peer-said': { text: string; peerId?: string };
  'leeway-rtc:peer-audio': { data: any; peerId?: string };
  'leeway-rtc:peer-video': { data: any; peerId?: string };
  'leeway-rtc:peer-id': { peerId: string };
  'leeway-rtc:peers': { peers: any[] };
  'leeway-rtc:audio-ready': { streamId: string };
  'leeway-rtc:reconnect-failed': {};
  // Additional agent events
  'agent:active': { agent: string; task: string };
  'agent:done': { agent: string; result?: string };
  'agent:error': { agent: string; error: string };
  'qwen:status-change': { status: 'unknown' | 'connecting' | 'online' | 'offline' };
  'qwen:response-generated': { input: string; output: string; model: string; requestCount: number };
  'qwen:error': { error: string; input: string; requestCount: number; errorCount: number };
  'emotion:detected': { emotion: string; confidence: number; style?: string };
  'vm:open': { agent: string; task: string };
  'vm:output': { chunk: string; output?: string };
  'vm:result': { language?: string; tested?: boolean; code?: string };
  'user:voice': { text: string; confidence: number; transcript?: string };
  'dream:start': {};
  'dream:end': { insights: string[] };
  'heal:start': { module: string };
  'heal:complete': { module: string; success: boolean };
  'memory:saved': { key: string };
  'launchpad:open': {};
  'permit:granted': { action: string; reason?: string };
  // Pallium and database events
  'pallium:initialized': { timestamp: number; databases: string[] };
  'pallium:record-queued': { recordId: string; type: string; queueSize: number };
  'pallium:query-started': { type: string; query: string; timestamp: number };
  'pallium:query-error': { source: string; error: string };
  'pallium:query-completed': { query: string; resultCount: number; sources: string[] };
  'pallium:delete-started': { recordId: string };
  'pallium:delete-completed': { recordId: string; deletedFrom: number };
  'pallium:sync-completed': { syncedCount: number; pendingCount: number };
  'pallium:health-check': { timestamp: number; results: Record<string, any> };
  'pallium:insert-started': { timestamp: number; dataType: string };
  'pallium:insert-completed': { documentsInserted: number; timestamp: number };
  'pallium:insert-error': { error: string; timestamp: number };
  // Schema registry events
  'schema:initialized': { databases: string[]; timestamp: number };
  'schema:registered': { database: string; version: string; collectionCount: number; timestamp: number };
  'schema:collection-created': { database: string; collection: string; fieldCount: number; timestamp: number };
  'schema:collection-updated': { database: string; collection: string; timestamp: number };
  'schema:exported': { databases: string[]; timestamp: number };
  'schema:export-error': { error: string };
  // Multi-database events
  'db:manager-initialized': { adapters: string[]; timestamp: number };
  'db:record-saved': { recordId: string; type: string; useCase: string; timestamp: number };
  'db:save-error': { error: string; type: string };
  'db:query-completed': { useCase: string; resultCount: number; duration: number; plan: string; timestamp: number };
  'db:query-error': { error: string; useCase: string };
  'db:optimization-started': { timestamp: number };
  'db:optimization-completed': { timestamp: number; recordsRemoved: number };
  'db:optimization-error': { error: string };
  // Launchpad events
  'launchpad:job_started': { jobId: string; launchId?: string };
  'launchpad:job_updated': { jobId: string; status: string; launchId?: string };
  'launchpad:job_finished': { jobId: string; status: string; result?: any; launchId?: string };
  // Native app events (DeviceTelemetry)
  'device:initialized': { platform: string; timestamp: number };
  'device:telemetry-changed': { metric: string; status: any };
  'device:permission-error': { permission: string; error: string };
  'device:permission-requested': { permission: string; granted: boolean };
  // Native app events (NativeBridge)
  'native:initialized': { platform: 'ios' | 'android' | 'web' | 'electron' };
  'native:photo-captured': { path: string; webPath: string };
  'native:camera-error': { error: string };
  'native:contacts-loaded': { count: number };
  'native:contacts-error': { error: string };
  'native:email-sent': { to: string[] };
  'native:email-error': { error: string };
  'native:sms-sent': { phone: string };
  'native:sms-error': { error: string };
  'native:calendar-opened': {};
  'native:calendar-error': { error: string };
  'native:event-created': { title: string; date: string };
  'native:event-error': { error: string };
  'native:notification-sent': { id: number; title: string };
  'native:notification-error': { error: string };
  'native:review-error': { error: string };
  // RTC initialization and state events
  'rtc:state-change': { state: string };
  'rtc:initialized': { timestamp: number };
  'rtc:init-error': { error: any };
  'rtc:voice-ready': { timestamp: number };
  'rtc:voice-error': { error: any };
  'rtc:vision-ready': { timestamp: number };
  'rtc:vision-error': { error: any };
  'rtc:vision-disabled': { reason: string };
  'rtc:health-check-failed': { error: any };
  'rtc:disconnected': { timestamp: number };
  // App-level RTC events
  'app:rtc-ready': { timestamp: number };
  'app:rtc-error': { error: string };
};

type Listener<T> = (data: T) => void;

class EventBusClass {
  private listeners: Map<string, Set<Listener<unknown>>> = new Map();

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(h => (h as Listener<EventMap[K]>)(data));
    }
  }

  on<K extends keyof EventMap>(event: K, listener: Listener<EventMap[K]>) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener as Listener<unknown>);
    // Return unsubscribe function
    return () => this.off(event, listener);
  }

  off<K extends keyof EventMap>(event: K, listener: Listener<EventMap[K]>) {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(listener as Listener<unknown>);
      // Auto-cleanup empty Sets to prevent memory leak
      if (set.size === 0) this.listeners.delete(event);
    }
  }

  once<K extends keyof EventMap>(event: K, listener: Listener<EventMap[K]>) {
    const wrapper: Listener<EventMap[K]> = (data) => {
      listener(data);
      this.off(event, wrapper);
    };
    return this.on(event, wrapper);
  }

  /** Diagnostic: total number of active listeners across all events */
  listenerCount(): number {
    let count = 0;
    for (const set of this.listeners.values()) count += set.size;
    return count;
  }
}

export const eventBus = new EventBusClass();



