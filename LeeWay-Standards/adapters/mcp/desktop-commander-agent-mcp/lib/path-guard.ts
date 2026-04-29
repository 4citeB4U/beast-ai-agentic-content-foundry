/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards

REGION: SECURITY.MCP.GUARD
TAG: SECURITY.MCP.PATH.GUARD

COLOR_ONION_HEX:
NEON=#FF1744
FLUO=#FF4081
PASTEL=#FFCDD2

ICON_ASCII:
family=lucide
glyph=shield

5WH:
WHAT = Path guard — enforces allowlisted root directories for all Desktop Commander file operations
WHY = Prevents path traversal attacks and unauthorized access to host file system areas
WHO = Agent Lee OS — MCP Security
WHERE = MCP agents/desktop-commander-agent-mcp/lib/path-guard.ts
WHEN = 2026
HOW = Normalizes and resolves all file paths, rejects any request outside allowed root list

AGENTS:
ASSESS
ALIGN
AUDIT
SHIELD

LICENSE:
PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections

import { normalize, resolve } from "path";

const ALLOWED_ROOTS: string[] = [
  "C:\\Tools\\Portable-VSCode-MCP-Kit",
  "C:\\Users\\Agent Lee\\Projects",
  "C:\\Users\\Agent Lee\\Desktop",
];

export function assertAllowedPath(rawPath: string): string {
  const normalized = normalize(resolve(rawPath));
  const allowed = ALLOWED_ROOTS.some((root) =>
    normalized.startsWith(normalize(root)),
  );
  if (!allowed) {
    throw new Error(
      `[DesktopCommanderAgent] Path "${normalized}" is outside allowed roots. Access denied.`,
    );
  }
  return normalized;
}
