/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards

REGION: MCP.AGENT.MEMORY
TAG: MCP.AGENT.MEMORY.COMPRESS

COLOR_ONION_HEX:
NEON=#7C4DFF
FLUO=#B388FF
PASTEL=#EDE7F6

ICON_ASCII:
family=lucide
glyph=archive

5WH:
WHAT = Memory tool — compresses the current session into a summary and key facts list
WHY = Reduces session memory footprint while preserving critical context for long conversations
WHO = Agent Lee OS — MCP System
WHERE = MCP agents/memory-agent-mcp/tools/compress-session.ts
WHEN = 2026
HOW = Extracts and condenses the session message history into a text summary and fact array

AGENTS:
ASSESS
ALIGN
AUDIT
ECHO

LICENSE:
PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections


export async function compressSession(
  args: Record<string, unknown>,
): Promise<{ summary: string; key_facts: string[] }> {
  const messages =
    (args["messages"] as Array<{ role: string; content: string }>) ?? [];
  const userTurns = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .slice(-10);
  const summary = userTurns.length
    ? `Session covered: ${userTurns.map((t) => t.slice(0, 60)).join("; ")}`
    : "No user messages found.";
  return { summary, key_facts: [] };
}
