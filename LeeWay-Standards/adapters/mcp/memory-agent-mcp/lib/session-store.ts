/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards

REGION: MCP.AGENT.MEMORY
TAG: MCP.AGENT.MEMORY.SESSION

COLOR_ONION_HEX:
NEON=#7C4DFF
FLUO=#B388FF
PASTEL=#EDE7F6

ICON_ASCII:
family=lucide
glyph=clock

5WH:
WHAT = Layer-1 session store — in-memory context store for the active conversation
WHY = Provides zero-latency context retrieval for the Memory MCP agent's session layer
WHO = Agent Lee OS — MCP System
WHERE = MCP agents/memory-agent-mcp/lib/session-store.ts
WHEN = 2026
HOW = In-memory Map indexed by session ID with append/read operations on SessionMessage arrays

AGENTS:
ASSESS
ALIGN
AUDIT
ECHO

LICENSE:
PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections


export interface SessionMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  ts: number;
}

class SessionStore {
  /** sessionId → ordered message list (most recent last) */
  private sessions = new Map<string, SessionMessage[]>();
  /** max messages retained per session before oldest are pruned */
  private readonly MAX_MSGS = 50;

  append(
    sessionId: string,
    role: "user" | "agent",
    content: string,
  ): SessionMessage {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, []);
    }
    const msgs = this.sessions.get(sessionId)!;
    const entry: SessionMessage = {
      id: `${sessionId}:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`,
      role,
      content,
      ts: Date.now(),
    };
    msgs.push(entry);
    // Prune oldest messages when over limit
    if (msgs.length > this.MAX_MSGS) {
      msgs.splice(0, msgs.length - this.MAX_MSGS);
    }
    return entry;
  }

  /**
   * Keyword search within a session's messages.
   * Returns up to 5 most-recent messages that contain any word from the query.
   */
  search(sessionId: string, query: string): SessionMessage[] {
    const msgs = this.sessions.get(sessionId) ?? [];
    if (msgs.length === 0 || !query.trim()) return [];
    const words = query
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3); // skip short stop-words
    if (words.length === 0) return msgs.slice(-5);
    const hits = msgs.filter((m) =>
      words.some((w) => m.content.toLowerCase().includes(w)),
    );
    return hits.slice(-5);
  }

  getSession(sessionId: string): SessionMessage[] {
    return this.sessions.get(sessionId) ?? [];
  }

  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  listSessions(): string[] {
    return Array.from(this.sessions.keys());
  }
}

/** Singleton exported for use across all memory-agent tools within this process */
export const sessionStore = new SessionStore();
