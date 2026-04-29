export enum AgentState {
  IDLE = "IDLE",
  LISTENING = "LISTENING",
  THINKING = "THINKING",
  SPEAKING = "SPEAKING",
  ERROR = "ERROR"
}
/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: AI.ORCHESTRATION.AGENT.TYPES
TAG: AI.ORCHESTRATION.AGENT.WORLDTYPES.FOUNDATION

COLOR_ONION_HEX:
NEON=#C084FC
FLUO=#E879F9
PASTEL=#F5D0FE

ICON_ASCII:
family=lucide
glyph=layers

5WH:
WHAT = Core TypeScript types and interfaces for the Agent Lee World of Agents
WHY = Shared type contracts (WakeState, AgentFamily, AgentIdentity, etc.) used across the entire Leeway Runtime Universe
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = core/AgentWorldTypes.ts
WHEN = 2026
HOW = Exported TypeScript enums, union types, and interfaces consumed by WorldRegistry, AgentRouter, Diagnostics, and all agent files

AGENTS:
ASSESS
AUDIT

LICENSE:
MIT
*/

/**
 * Agent Lee World of Agents — Core Types
 * Defined by the Leeway Runtime Universe
 */

export type WakeState = "HIBERNATE" | "SLEEP" | "IDLE" | "ACTIVE" | "COUNCIL";

export type AgentFamily = 
  | "LEE"       // Command / Sovereignty
  | "CORTEX"    // Cognition / Intelligence
  | "ARCHIVE"   // Memory / History
  | "AEGIS"     // Defense / Security
  | "FORGE"     // Engineering / Construction
  | "VECTOR"    // Exploration / Discovery
  | "AURA"      // Creativity / Expression
  | "NEXUS"     // Deployment / Execution
  | "SENTINEL"; // Diagnostics / Oversight

export type AgentIdentity = {
  id: string;
  name: string;
  family: AgentFamily;
  title: string;
  role: string;
  archetype: string;
  
  purpose: string;
  primaryGoals: string[];
  secondaryGoals: string[];

  personality: {
    traits: string[];
    tone: string;
    behaviorStyle: string;
  };

  drives: {
    curiosity: number;      // 0-1
    responsibility: number; // 0-1
    urgency: number;        // 0-1
    social: number;         // 0-1
    precision: number;       // 0-1
  };

  state: {
    wakeState: WakeState;
    mood: string;
    energy: number;   // 0-100
    stress: number;   // 0-100
    focus: number;    // 0-100
  };

  relationships: Record<string, {
    trust: number;      // 0-1
    dependency: number; // 0-1
    friction: number;   // 0-1
  }>;

  permissions: string[];
  
  voice: {
    tone: string;
    style: string;
  };

  visual: {
    color: string;
    icon: string;
    animation: string;
  };
};
