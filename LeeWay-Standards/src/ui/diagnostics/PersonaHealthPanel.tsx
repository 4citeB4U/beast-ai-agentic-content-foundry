/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

PROFILE: LEEWAY-ORDER
TAG: UI.DIAGNOSTICS.PERSONA.HEALTH_PANEL
REGION: 🖥️ UI
VERSION: 1.0.0

COLOR_ONION_HEX:
NEON=#00FFFF
FLUO=#00E5FF
PASTEL=#B2EBF2

ICON_ASCII:
family=lucide
glyph=activity

5WH:
WHAT = Persona health diagnostics panel — shows superior prompt status, active mode/overlay,
       poetry bank key count, lingo refresh status, and per-module readiness rows
WHY = Provides real-time visibility into the Agent Lee persona stack so the developer can
      confirm all layers loaded correctly and are operating as expected
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = src/ui/diagnostics/PersonaHealthPanel.tsx
WHEN = 2026
HOW = React functional component reading window.__agentleeModules and window.AgentLeePersonaEngine
      globals set during AgentNotepad startup; polls every POLL_INTERVAL_MS for live status

AGENTS:
ASSESS
AUDIT

CONSTITUTIONAL_RULE:
"Agent Lee Cores think, Leeway Standards govern, hive agents serve, and Lee Prime commands."

LICENSE:
MIT
*/

import React, { useState, useEffect, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Section 1 — Ambient window accessors (reads only — full declarations live in AgentNotepad.tsx)
// ─────────────────────────────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
const w = window as any;

// ─────────────────────────────────────────────────────────────────────────────
// Section 2 — Health snapshot type
// ─────────────────────────────────────────────────────────────────────────────

interface ModuleRow {
  name: string;
  status: "ready" | "failed" | "pending";
}

interface PersonaHealthSnapshot {
  superiorPromptLoaded: boolean;
  superiorPromptLength: number;
  activeMode: string;
  activeOverlay: string;
  poetryKeyCount: number;
  lingoLastRefreshedAt: string | null;
  lingoTermCount: number;
  moduleRows: ModuleRow[];
  capturedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 3 — Snapshot reader
// ─────────────────────────────────────────────────────────────────────────────

const EXPECTED_MODULES = ["poetry", "engine", "lingo"];

function readSnapshot(): PersonaHealthSnapshot {
  const modules: { loaded: string[]; failed: string[] } | undefined = w.__agentleeModules;
  const prompt: string = w.__agentleeSuperiorPrompt ?? "";
  const personaState: Record<string, unknown> = w.AgentLeePersonaEngine?.getPersonalityState?.() ?? {};
  const poetryKeys: string[] = w.AgentLeePoetryBank?.keys?.() ?? [];
  const lingoWorker = w.AgentLeeLingoWorker;

  const moduleRows: ModuleRow[] = EXPECTED_MODULES.map((name) => {
    if (!modules) return { name, status: "pending" };
    if (modules.loaded.includes(name)) return { name, status: "ready" };
    if (modules.failed.includes(name)) return { name, status: "failed" };
    return { name, status: "pending" };
  });

  return {
    superiorPromptLoaded: prompt.length > 0,
    superiorPromptLength: prompt.length,
    activeMode: String(personaState["mode"] ?? personaState["currentMode"] ?? "—"),
    activeOverlay: String(personaState["overlay"] ?? personaState["currentOverlay"] ?? "—"),
    poetryKeyCount: poetryKeys.length,
    lingoLastRefreshedAt: lingoWorker?.lastRefresh?.refreshedAt ?? null,
    lingoTermCount: lingoWorker?.lastRefresh?.count ?? 0,
    moduleRows,
    capturedAt: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 4 — Styles (inline; no external CSS dependency)
// ─────────────────────────────────────────────────────────────────────────────

const PANEL_STYLE: React.CSSProperties = {
  background: "rgba(0, 10, 20, 0.92)",
  border: "1px solid #00FFFF44",
  borderRadius: 8,
  padding: "12px 16px",
  fontFamily: '"JetBrains Mono", "Fira Code", monospace',
  fontSize: 12,
  color: "#B2EBF2",
  minWidth: 280,
  maxWidth: 360,
  boxShadow: "0 0 16px #00FFFF18",
  userSelect: "none",
};

const TITLE_STYLE: React.CSSProperties = {
  color: "#00FFFF",
  fontWeight: 700,
  fontSize: 13,
  marginBottom: 10,
  letterSpacing: 1,
  textTransform: "uppercase",
};

const ROW_STYLE: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 5,
  gap: 8,
};

const LABEL_STYLE: React.CSSProperties = {
  color: "#93C5FD",
  flexShrink: 0,
};

const VALUE_STYLE: React.CSSProperties = {
  color: "#E0F2FE",
  textAlign: "right",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const DIVIDER_STYLE: React.CSSProperties = {
  borderBottom: "1px solid #00FFFF22",
  margin: "8px 0",
};

function statusDot(status: "ready" | "failed" | "pending"): React.ReactElement {
  const colors: Record<typeof status, string> = {
    ready: "#22C55E",
    failed: "#EF4444",
    pending: "#F59E0B",
  };
  return (
    <span
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: colors[status],
        marginRight: 6,
        flexShrink: 0,
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 5 — Component
// ─────────────────────────────────────────────────────────────────────────────

export interface PersonaHealthPanelProps {
  /** Poll interval in ms. Set to 0 to disable polling and render once. Default: 3000. */
  pollIntervalMs?: number;
  /** If true the panel is visible; if false it renders nothing. Default: true. */
  visible?: boolean;
}

export function PersonaHealthPanel({
  pollIntervalMs = 3000,
  visible = true,
}: PersonaHealthPanelProps): React.ReactElement | null {
  const [snapshot, setSnapshot] = useState<PersonaHealthSnapshot>(() =>
    readSnapshot()
  );

  const refresh = useCallback(() => {
    setSnapshot(readSnapshot());
  }, []);

  useEffect(() => {
    if (!visible || pollIntervalMs === 0) return;
    const id = setInterval(refresh, pollIntervalMs);
    return () => clearInterval(id);
  }, [visible, pollIntervalMs, refresh]);

  if (!visible) return null;

  const { superiorPromptLoaded, superiorPromptLength, activeMode, activeOverlay,
    poetryKeyCount, lingoLastRefreshedAt, lingoTermCount, moduleRows, capturedAt } = snapshot;

  return (
    <div style={PANEL_STYLE} title={`Last updated: ${capturedAt}`}>
      <div style={TITLE_STYLE}>⚙ Persona Health</div>

      {/* Superior Prompt */}
      <div style={ROW_STYLE}>
        <span style={LABEL_STYLE}>Superior Prompt</span>
        <span style={{ ...VALUE_STYLE, color: superiorPromptLoaded ? "#22C55E" : "#EF4444" }}>
          {superiorPromptLoaded ? `✓ ${superiorPromptLength.toLocaleString()} chars` : "✗ Not loaded"}
        </span>
      </div>

      {/* Active Mode */}
      <div style={ROW_STYLE}>
        <span style={LABEL_STYLE}>Active Mode</span>
        <span style={VALUE_STYLE}>{activeMode}</span>
      </div>

      {/* Active Overlay */}
      <div style={ROW_STYLE}>
        <span style={LABEL_STYLE}>Active Overlay</span>
        <span style={VALUE_STYLE}>{activeOverlay}</span>
      </div>

      <div style={DIVIDER_STYLE} />

      {/* Poetry Bank */}
      <div style={ROW_STYLE}>
        <span style={LABEL_STYLE}>Poetry Keys</span>
        <span style={{ ...VALUE_STYLE, color: poetryKeyCount > 0 ? "#22C55E" : "#F59E0B" }}>
          {poetryKeyCount > 0 ? poetryKeyCount : "—"}
        </span>
      </div>

      {/* Lingo Worker */}
      <div style={ROW_STYLE}>
        <span style={LABEL_STYLE}>Lingo Refresh</span>
        <span style={{ ...VALUE_STYLE, color: lingoLastRefreshedAt ? "#22C55E" : "#F59E0B" }}>
          {lingoLastRefreshedAt
            ? `✓ ${lingoTermCount} terms`
            : "pending"}
        </span>
      </div>

      <div style={DIVIDER_STYLE} />

      {/* Module rows */}
      <div style={{ ...LABEL_STYLE, marginBottom: 6 }}>Modules</div>
      {moduleRows.map((row) => (
        <div key={row.name} style={ROW_STYLE}>
          <span style={{ display: "flex", alignItems: "center", color: "#B2EBF2" }}>
            {statusDot(row.status)}
            {row.name}
          </span>
          <span
            style={{
              ...VALUE_STYLE,
              fontSize: 10,
              color:
                row.status === "ready"
                  ? "#22C55E"
                  : row.status === "failed"
                  ? "#EF4444"
                  : "#F59E0B",
            }}
          >
            {row.status}
          </span>
        </div>
      ))}

      {/* Refresh button */}
      <div style={{ marginTop: 10, textAlign: "right" }}>
        <button
          onClick={refresh}
          style={{
            background: "transparent",
            border: "1px solid #00FFFF55",
            borderRadius: 4,
            color: "#00FFFF",
            cursor: "pointer",
            fontSize: 10,
            padding: "2px 8px",
            letterSpacing: 0.5,
          }}
        >
          Refresh
        </button>
      </div>
    </div>
  );
}

export default PersonaHealthPanel;
