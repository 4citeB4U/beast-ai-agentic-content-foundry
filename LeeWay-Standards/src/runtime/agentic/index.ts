/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards

REGION: CORE.RUNTIME.ADAPTER
TAG: CORE.RUNTIME.ADAPTER.PROJECTION_RUNTIME

COLOR_ONION_HEX:
NEON=#00E5FF
FLUO=#22D3EE
PASTEL=#CFFAFE

ICON_ASCII:
family=lucide
glyph=shield-check

5WH:
WHAT = Projection-safe runtime adapter barrel
WHY = Provides the only sanctioned import surface from projection UI into restored runtime and governance modules
WHO = Leeway Industries / LeeWay Governance Team
WHERE = src/runtime/index.ts
WHEN = 2026
HOW = Re-exports vetted symbols from src/legacy-restored/core and governance runtime modules while direct legacy imports are blocked in Vite

CHAIN: Standards → Integrated → Runtime → Projections
LICENSE: PROPRIETARY
*/

export { logIdentityLoad, buildAgentLeeCorePrompt } from '../legacy-restored/core/agent_lee_prompt_assembler';
export { BODY_SYSTEM_ATLAS, createBodyAwarenessSnapshot } from '../legacy-restored/core/agent_lee_system_awareness';
export { pushDiagnosticsReport } from '../legacy-restored/core/diagnostics_bridge';
export { eventBus } from '../legacy-restored/core/EventBus';
export { MemoryDB } from '../legacy-restored/core/MemoryDB';
export { parseLeePrimeCommand, LEE_PRIME_COMMANDS, WORKFLOWS } from '../legacy-restored/core/GovernanceContract';
export { TaskGraph } from '../legacy-restored/core/TaskGraph';
export { CheckpointManager } from '../legacy-restored/core/CheckpointManager';
export { FirebaseService } from '../legacy-restored/core/FirebaseService';
export { BackgroundTaskManager } from '../legacy-restored/core/BackgroundTaskManager';
export { WidgetCommandController } from '../legacy-restored/core/WidgetCommandController';
export { PalliumGateway, insertAgentLeeDocuments } from '../legacy-restored/core/PalliumGateway';
export { MultiDatabaseManager } from '../legacy-restored/core/MultiDatabaseManager';
export { SchemaRegistry } from '../legacy-restored/core/SchemaRegistry';
export { DeviceTelemetry } from '../legacy-restored/core/DeviceTelemetry';
export { NativeBridge } from '../legacy-restored/core/NativeBridge';
export { AgentLeeRuntimeBootstrap } from '../legacy-restored/core/AgentLeeRuntimeBootstrap';
export { sendTTS } from '../legacy-restored/core/ttsBridge';
export { AgentRouter } from '../legacy-restored/core/AgentRouter';
export { VoiceService } from '../legacy-restored/core/VoiceService';
export { enforceFileGovernance } from '../legacy-restored/core/governanceEnforcer';
export { createFileMeta, logFileEvent } from '../legacy-restored/core/fileOps';
export { StudioExecutionController, CREATIVE_PROFILE } from '../legacy-restored/core/execution/StudioExecutionController';
export { palliumClient } from '../legacy-restored/core/launchpad/memoryLakeClient';
export type { LaunchRecord, DeployableBundle } from '../legacy-restored/core/launchpad/types';
export { AgentState } from '../legacy-restored/core/AgentWorldTypes';
export { AgentService } from '../legacy-restored/core/agent_lee_persona';
export { MORPH_FORMS, Generators, V_RES } from '../legacy-restored/core/agent_lee_behavior_contract';
export { bootGovernanceRuntime } from '../legacy-restored/core/runtime/governanceBridge';
export { runExecution, subscribeExecutionEvents, auditExecution } from '../legacy-restored/core/runtime/executionKernel';
