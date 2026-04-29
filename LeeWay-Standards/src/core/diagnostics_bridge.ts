/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: AI.ORCHESTRATION.CORE.DIAGNOSTICS
TAG: AI.ORCHESTRATION.CORE.DIAGNOSTICS.BRIDGE

COLOR_ONION_HEX:
NEON=#00F2FF
FLUO=#1BF7CD
PASTEL=#A5F3FC

ICON_ASCII:
family=lucide
glyph=activity

5WH:
WHAT = Diagnostics bridge for cross-surface telemetry reports
WHY = Ensures all major surfaces can report health and routing context into the Diagnostics Center
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = core/diagnostics_bridge.ts
WHEN = 2026
HOW = Local storage report queue with bounded retention and unified report payload shape

AGENTS:
ASSESS
AUDIT
SHIELD

LICENSE:
MIT
*/

export interface DiagnosticsReport {
  id: string;
  surface: string;
  status: 'ok' | 'warn' | 'error';
  message: string;
  agents: string[];
  mcps: string[];
  tags: string[];
  timestamp: string;
}

const REPORTS_KEY = 'agent_lee_diagnostics_reports';
const MAX_REPORTS = 400;

export function readDiagnosticsReports(): DiagnosticsReport[] {
  try {
    const raw = localStorage.getItem(REPORTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error(error);
    return [];
  }
}

export function pushDiagnosticsReport(
  report: Omit<DiagnosticsReport, 'id' | 'timestamp'>
) {
  try {
    const next: DiagnosticsReport = {
      ...report,
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      timestamp: new Date().toISOString()
    };
    const reports = readDiagnosticsReports();
    const updated = [next, ...reports].slice(0, MAX_REPORTS);
    localStorage.setItem(REPORTS_KEY, JSON.stringify(updated));
    return next;
  } catch (error) {
    console.error(error);
    return null;
  }
}
