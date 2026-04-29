/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: AI.ORCHESTRATION.CORE.AWARENESS
TAG: AI.ORCHESTRATION.CORE.AWARENESS.BODYMAP

COLOR_ONION_HEX:
NEON=#00F2FF
FLUO=#1BF7CD
PASTEL=#BAE6FD

ICON_ASCII:
family=lucide
glyph=network

5WH:
WHAT = Shared system awareness map for Agent Lee surfaces, governance chain, and body routing
WHY = Keeps every major app surface aligned to the same architectural truth and memory governance model
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = core/agent_lee_system_awareness.ts
WHEN = 2026
HOW = Typed metadata registry for UI surfaces, monitoring lanes, and governance order

AGENTS:
ASSESS
ALIGN
AUDIT
NEXUS

LICENSE:
MIT
*/

export type BodySurfaceId =
  | 'home'
  | 'diagnostics'
  | 'settings'
  | 'deployment'
  | 'memory'
  | 'code'
  | 'database'
  | 'creators'
  | 'universe'
  | 'vm';

export interface SurfaceAwareness {
  id: BodySurfaceId;
  label: string;
  layer: string;
  color: string;
  summary: string;
  memoryRole: string;
  diagnosticRole: string;
  route: string;
  monitors: string[];
  linkedSystems: string[];
}

export const AGENT_LEE_GOVERNANCE_ORDER = [
  {
    id: 'memory',
    label: 'Memory Lake',
    role: 'Governs persistence, lineage, recall, and system record across the whole body.'
  },
  {
    id: 'diagnostics',
    label: '3D Diagnostics Brain',
    role: 'Monitors routing, health, and awareness signals across every live surface.'
  },
  {
    id: 'surface',
    label: 'Active Surface',
    role: 'Executes the current function while reporting back into the governing stack.'
  }
] as const;

export const SURFACE_AWARENESS: Record<BodySurfaceId, SurfaceAwareness> = {
  home: {
    id: 'home',
    label: 'Home Surface',
    layer: 'Identity Surface',
    color: '#00F2FF',
    summary: 'Primary embodiment surface for conversation, manifestation, and user entry into the system.',
    memoryRole: 'Stores primary interactions, manifestations, and user-facing continuity.',
    diagnosticRole: 'Confirms embodiment, voice state, and active interaction readiness.',
    route: 'User -> Home -> Memory Lake -> Diagnostics -> Agent team',
    monitors: ['Conversation state', 'Manifestation status', 'Voice readiness'],
    linkedSystems: ['Memory Lake', 'Diagnostics', 'Agent Lee [role:planner]', 'Agent Pixel [role:visualizer]']
  },
  diagnostics: {
    id: 'diagnostics',
    label: '3D Diagnostics Brain',
    layer: 'Monitoring Surface',
    color: '#9854FF',
    summary: 'Live neural observability surface for system mapping, telemetry, and architecture awareness.',
    memoryRole: 'Reads persisted health, logs, and topology references from Memory Lake.',
    diagnosticRole: 'Acts as the body monitor for agents, models, MCPs, and memory health.',
    route: 'Telemetry -> Diagnostics Brain -> Surface alerts -> Memory Lake',
    monitors: ['Topology health', 'Node status', 'Telemetry drift'],
    linkedSystems: ['Memory Lake', 'MCP Grid', 'Agent Router']
  },
  settings: {
    id: 'settings',
    label: 'Settings Surface',
    layer: 'Governance Surface',
    color: '#94A3B8',
    summary: 'Control plane for model selection, voice, offline behavior, and operating constraints.',
    memoryRole: 'Commits system configuration decisions into durable memory and fallback state.',
    diagnosticRole: 'Exposes changes that must be watched for risk, drift, or conflict.',
    route: 'Operator -> Settings -> Memory Lake -> Diagnostics Brain',
    monitors: ['Configuration drift', 'Model policy', 'Offline posture'],
    linkedSystems: ['Memory Lake', 'Diagnostics', 'Agent Guard [role:monitor]']
  },
  deployment: {
    id: 'deployment',
    label: 'Deployment Surface',
    layer: 'Execution Surface',
    color: '#10B981',
    summary: 'Launch and infrastructure lane for shipping applications while preserving system accountability.',
    memoryRole: 'Records deployment events, target environments, and lifecycle history.',
    diagnosticRole: 'Watches health, latency, and production-state signals after release.',
    route: 'Code Studio -> Deployment -> Infrastructure -> Diagnostics -> Memory Lake',
    monitors: ['Deploy health', 'Runtime latency', 'Environment drift'],
    linkedSystems: ['Memory Lake', 'Diagnostics', 'Code Studio', 'Agent Patch [role:deployer]']
  },
  memory: {
    id: 'memory',
    label: 'Memory Lake',
    layer: 'Governance Root',
    color: '#22D3EE',
    summary: 'The governing persistence body that stores lineage, context, files, archives, and state history.',
    memoryRole: 'Root authority for recall, lineage, and operational continuity.',
    diagnosticRole: 'Supplies the ground truth that the diagnostics brain observes and explains.',
    route: 'Every surface -> Memory Lake -> Diagnostics Brain -> Every surface',
    monitors: ['Integrity', 'Recall readiness', 'Lineage completeness'],
    linkedSystems: ['Diagnostics', 'All surfaces', 'Cold Store']
  },
  code: {
    id: 'code',
    label: 'Code Studio',
    layer: 'Builder Surface',
    color: '#007ACC',
    summary: 'VM-first build environment where Agent Lee writes, edits, previews, and tests system code.',
    memoryRole: 'Stores code artifacts, task progress, and workspace notes into governed memory lanes.',
    diagnosticRole: 'Monitors build-state, terminal health, and execution reliability.',
    route: 'Task -> Code Studio -> Memory Lake -> Deployment/Diagnostics',
    monitors: ['Build progress', 'Terminal health', 'Workspace state'],
    linkedSystems: ['Memory Lake', 'Deployment', 'Diagnostics', 'Agent Syntax [role:writer]']
  },
  database: {
    id: 'database',
    label: 'Database Hub',
    layer: 'Data Surface',
    color: '#6C47FF',
    summary: 'Structured data administration layer for multi-database visibility and record management.',
    memoryRole: 'Tracks database state as part of the broader persistence body.',
    diagnosticRole: 'Surfaces connection health, throughput, and stability signals.',
    route: 'Data systems -> Database Hub -> Diagnostics -> Memory Lake',
    monitors: ['Cluster health', 'Query load', 'Connection status'],
    linkedSystems: ['Memory Lake', 'Diagnostics', 'Database systems']
  },
  creators: {
    id: 'creators',
    label: 'Creators Studio',
    layer: 'Creative Surface',
    color: '#FF00FF',
    summary: 'Creative workflow surface for campaigns, stories, video flows, and visual generation.',
    memoryRole: 'Captures creative assets, prompt lineage, and campaign decisions into governed storage.',
    diagnosticRole: 'Watches generation health, workflow routing, and creative node status.',
    route: 'Creator prompt -> Creators Studio -> Memory Lake -> Diagnostics Brain',
    monitors: ['Workflow health', 'Asset generation', 'Signal quality'],
    linkedSystems: ['Memory Lake', 'Diagnostics', 'Agent Pixel [role:visualizer]', 'Agent Aria [role:facilitator]']
  },
  universe: {
    id: 'universe',
    label: 'Leeway Universe',
    layer: 'Civilization Surface',
    color: '#FFD700',
    summary: 'The living heart of the Agent Lee civilization. A 3D space for monitoring, interacting, and managing the sovereign agent collective.',
    memoryRole: 'Central hub for real-time agent state, lineage, and collective memory.',
    diagnosticRole: 'Primary observability node for the entire agent fleet.',
    route: 'Universe -> Agent Fleet -> Memory Lake -> Diagnostics',
    monitors: ['Civilization health', 'Agent collective status', 'Real-time tasks'],
    linkedSystems: ['All Agents', 'Memory Lake', 'Diagnostics Brain']
  },
  vm: {
    id: 'vm',
    label: 'Agent Lee Workstation',
    layer: 'Execution Surface',
    color: '#00E5FF',
    summary: 'Full-stack execution workstation — code editor, terminal, browser preview, and agent-directed development environment.',
    memoryRole: 'Logs code changes, task outcomes, and file mutations into governed storage.',
    diagnosticRole: 'Reports execution health, build status, and agent activity from the workstation surface.',
    route: 'Workstation -> Agent Lee VM -> Memory Lake -> Diagnostics Brain',
    monitors: ['Build health', 'File mutations', 'Terminal output', 'Agent task progress'],
    linkedSystems: ['Memory Lake', 'Diagnostics Brain', 'Code Studio', 'Agent Nova [role:builder]']
  }
};

export const BODY_SYSTEM_ATLAS = [
  { label: 'Governance Root', value: 'Memory Lake' },
  { label: 'Body Monitor', value: '3D Diagnostics Brain' },
  { label: 'Builder Arm', value: 'Code Studio' },
  { label: 'Creative Arm', value: 'Creators Studio' },
  { label: 'Launch Arm', value: 'Deployment' },
  { label: 'Policy Spine', value: 'Settings' }
] as const;

export function getSurfaceAwareness(surfaceId: BodySurfaceId): SurfaceAwareness {
  return SURFACE_AWARENESS[surfaceId];
}

export function createBodyAwarenessSnapshot(surfaceId: BodySurfaceId) {
  const surface = SURFACE_AWARENESS[surfaceId];
  return {
    surfaceId,
    label: surface.label,
    layer: surface.layer,
    governedBy: 'Memory Lake',
    monitoredBy: '3D Diagnostics Brain',
    route: surface.route,
    timestamp: new Date().toISOString()
  };
}
