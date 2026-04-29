/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards

REGION: MCP.CONTRACTS.VOCAB
TAG: MCP.CONTRACTS.CAPABILITY.VOCAB

COLOR_ONION_HEX:
NEON=#FF00FF
FLUO=#E100FF
PASTEL=#F3E5F5

ICON_ASCII:
family=lucide
glyph=tags

5WH:
WHAT = Capability & Role Vocabulary — standardized tokens for MCP agent routing and orchestration
WHY = Provides a deterministic language for the Agent Router to select agents for specific workflow steps
WHO = Agent Lee OS — Core System
WHERE = MCP agents/contracts/capability-vocab.ts
WHEN = 2026
HOW = Exported string constants and type definitions for capabilities and workflow roles

AGENTS:
ALIGN
ASSESS
AUDIT

LICENSE:
PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections


/**
 * CANONICAL CAPABILITIES
 * High-level atomic abilities an agent can perform.
 */
export const CAPABILITIES = {
  PLAN: "cap:plan",
  MEMORY_READ: "cap:memory.read",
  MEMORY_WRITE: "cap:memory.write",
  FS_READ: "cap:fs.read",
  FS_WRITE: "cap:fs.write",
  TERMINAL_EXEC: "cap:terminal.exec",
  TERMINAL_PTY: "cap:terminal.pty",
  BROWSER_AUTOMATION: "cap:browser.automation",
  DEPLOY_STATIC: "cap:deploy.web.static",
  DEPLOY_FULLSTACK: "cap:deploy.web.fullstack",
  PUBLISH_SOCIAL: "cap:publish.social",
  PUBLISH_EMAIL: "cap:publish.email",
  SEO_CONSOLE: "cap:seo.search_console",
  SEO_SITEMAP: "cap:seo.sitemap",
  VISION: "cap:vision",
  VOICE: "cap:voice",
  VERIFY_HTTP: "cap:verify.http",
  VERIFY_UI: "cap:verify.ui",
} as const;

/**
 * WORKFLOW ROLES
 * Specialized positions an agent occupies within a multi-step job.
 */
export const WORKFLOW_ROLES = {
  INTAKE: "role:intake",
  PLANNER: "role:planner",
  BUILDER: "role:builder",
  PACKAGER: "role:packager",
  PUBLISHER: "role:publisher",
  MARKETER: "role:marketer",
  SEO: "role:seo",
  VERIFIER: "role:verifier",
  MONITOR: "role:monitor",
  RECOVERY: "role:recovery",
} as const;

export type Capability = typeof CAPABILITIES[keyof typeof CAPABILITIES];
export type WorkflowRole = typeof WORKFLOW_ROLES[keyof typeof WORKFLOW_ROLES];

export interface AgentOps {
  mutates: boolean;
  audit_required: boolean;
  secrets_access: "none" | "read" | "write";
  risk: "low" | "medium" | "high";
  cost: "free" | "metered" | "unknown";
}
