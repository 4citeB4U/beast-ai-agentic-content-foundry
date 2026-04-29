/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: AI.ORCHESTRATION.AGENT.MEMORY
TAG: AI.ORCHESTRATION.AGENT.SAGE.MEMORY

COLOR_ONION_HEX:
NEON=#10B981
FLUO=#34D399
PASTEL=#A7F3D0

ICON_ASCII:
family=lucide
glyph=database

5WH:
WHAT = Sage memory and dream-cycle agent — persistent log storage, 26-hour dream synthesis, memory recall
WHY = Gives Agent Lee continuous memory, long-term pattern recognition, and dream-derived insight generation
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = agents/Sage.ts
WHEN = 2026-04-04
HOW = Static class using Firestore + localStorage fallback, with deterministic dream synthesis

AGENTS:
ASSESS
AUDIT
leeway
MEMORY

LICENSE:
MIT
*/

// agents/Sage.ts — Memory & Dream Cycle Agent
// Manages persistent memory via Firestore + IndexedDB.
// Runs the 26-hour dream cycle: compress → synthesize → store → wake with insight.

import { eventBus } from '../../core/EventBus';
import { AgentCognition } from '../../core/AgentCognitionProvider';
import { MemoryDB } from '../../core/MemoryDB';

export interface MemoryLog {
  id?: string;
  userId: string;
  type: 'conversation' | 'task' | 'error' | 'insight' | 'dream';
  content: string;
  agent?: string;
  timestamp: Date;
  accessible: boolean;    // false = suppressed until next dream
  tags?: string[];
}


export interface DreamInsight {
  id: string;
  content: string;
  sourceEvents: string[];
  accessible: boolean;
  createdInDream: number;   // dream cycle number
}

const DREAM_INTERVAL_MS = 26 * 60 * 60 * 1000; // 26 hours
function synthesizeDreamInsights(logs: MemoryLog[], cycleNumber: number): DreamInsight[] {
  const byType = new Map<MemoryLog['type'], number>();
  const byAgent = new Map<string, number>();

  for (const log of logs) {
    byType.set(log.type, (byType.get(log.type) ?? 0) + 1);
    if (log.agent) {
      byAgent.set(log.agent, (byAgent.get(log.agent) ?? 0) + 1);
    }
  }

  const dominantType = [...byType.entries()].sort((a, b) => b[1] - a[1])[0];
  const dominantAgent = [...byAgent.entries()].sort((a, b) => b[1] - a[1])[0];
  const errorCount = byType.get('error') ?? 0;
  const insights: DreamInsight[] = [];

  if (dominantType) {
    insights.push({
      id: `dream-${cycleNumber}-0`,
      content: `Pattern detected: ${dominantType[0]} activity led recent memory flow with ${dominantType[1]} recorded events.`,
      sourceEvents: logs.slice(0, 5).map(log => log.content),
      accessible: true,
      createdInDream: cycleNumber,
    });
  }

  if (dominantAgent) {
    insights.push({
      id: `dream-${cycleNumber}-1`,
      content: `Operational center of gravity: ${dominantAgent[0]} produced the most recoverable signal during this cycle.`,
      sourceEvents: logs.filter(log => log.agent === dominantAgent[0]).slice(0, 5).map(log => log.content),
      accessible: true,
      createdInDream: cycleNumber,
    });
  }

  if (errorCount > 0) {
    insights.push({
      id: `dream-${cycleNumber}-2`,
      content: `Risk pattern: ${errorCount} error events were archived. Prioritize regression checks around the highest-frequency failure path.`,
      sourceEvents: logs.filter(log => log.type === 'error').slice(0, 5).map(log => log.content),
      accessible: errorCount < 3,
      createdInDream: cycleNumber,
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: `dream-${cycleNumber}-0`,
      content: 'Dream cycle completed with insufficient signal for deeper synthesis. Continue collecting governed receipts.',
      sourceEvents: [],
      accessible: true,
      createdInDream: cycleNumber,
    });
  }

  return insights;
}

export class Sage {
  private static dreamCycleNumber = 0;
  private static dreamTimer: ReturnType<typeof setTimeout> | null = null;
  private static sessionLogs: MemoryLog[] = [];

  // ─── Memory ──────────────────────────────────────────────────────────────

  static log(type: MemoryLog['type'], content: string, agent?: string, tags?: string[]) {
    const userId = 'local-user';
    
    const log: MemoryLog = {
      userId,
      type,
      content,
      agent,
      timestamp: new Date(),
      accessible: true,
      tags,
    };
    
    // Store in memory for session
    this.sessionLogs.push(log);
    
    // Persist to MemoryDB (non-blocking)
    this.persistLog(log).catch(console.error);
    
    eventBus.emit('memory:saved', { key: `${type}:${Date.now()}` });
  }

  private static async persistLog(log: MemoryLog): Promise<void> {
    try {
      const existing = (await MemoryDB.get<MemoryLog[]>('agent_lee_logs')) || [];
      await MemoryDB.set('agent_lee_logs', [...existing, log].slice(-500));
    } catch (err) {
      console.error('[Sage] MemoryDB persistence failed:', err);
    }
  }

  static async getRecentLogs(hours = 168): Promise<MemoryLog[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    try {
      const all = (await MemoryDB.get<MemoryLog[]>('agent_lee_logs')) || [];
      return all.filter(l => new Date(l.timestamp) >= since);
    } catch {
      return this.sessionLogs.filter(l => l.timestamp >= since);
    }
  }

  // ─── Dream Cycle ─────────────────────────────────────────────────────────

  static startDreamCycle() {
    if (this.dreamTimer) clearTimeout(this.dreamTimer);
    
    // Schedule first dream
    this.dreamTimer = setTimeout(() => {
      this.enterDreamState();
    }, DREAM_INTERVAL_MS);
    
    console.info(`[Sage] Dream cycle initialized. Next dream in 26 hours.`);
  }

  static async enterDreamState(): Promise<DreamInsight[]> {
    this.dreamCycleNumber++;
    eventBus.emit('dream:start', {});
    
    const logs = await this.getRecentLogs(24 * 7); // Last week
    const logSummary = logs
      .map(l => `[${l.type}:${l.agent || 'system'}] ${l.content}`)
      .join('\n')
      .slice(0, 8000); // Limit context

    let insights: DreamInsight[] = [];
    try {
      insights = synthesizeDreamInsights(logs, this.dreamCycleNumber);
      // Store all insights
      await this.persistLog({
        userId: 'local-user',
        type: 'dream',
        content: JSON.stringify({ cycle: this.dreamCycleNumber, logSummary, insights }),
        timestamp: new Date(),
        accessible: true,
      });
    } catch (err) {
      console.error('[Sage] Dream synthesis failed:', err);
    }
    return insights;
  }

  static getSessionLogs(): MemoryLog[] {
    return [...this.sessionLogs];
  }

  static async summarize(topic: string): Promise<string> {
    const logs = await this.getRecentLogs(72);
    const relevant = logs.filter(l => 
      l.content.toLowerCase().includes(topic.toLowerCase())
    );

    if (relevant.length === 0) return `No memory found related to "${topic}".`;

    const prompt = `Summarize what Agent Lee knows about "${topic}" based on these memory logs:\n${
        relevant.map(l => l.content).join('\n').slice(0, 4000)
      }`;
    const result = await AgentCognition.generate(prompt);
    return result;
  }
}

