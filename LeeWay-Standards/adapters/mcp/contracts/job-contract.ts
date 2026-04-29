/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards

REGION: MCP.CONTRACTS.JOBS
TAG: MCP.CONTRACTS.JOB.SCHEMA

COLOR_ONION_HEX:
NEON=#FFFF00
FLUO=#FFEA00
PASTEL=#FFFDE7

ICON_ASCII:
family=lucide
glyph=workflow

5WH:
WHAT = Job & Step Contract — standardized schema for OS-wide orchestration
WHY = Provides a unified format for executing complex multi-step missions across agents
WHO = Agent Lee OS — Core System
WHERE = MCP agents/contracts/job-contract.ts
WHEN = 2026
HOW = Exported interfaces for Jobs, Steps, and Execution Events

AGENTS:
PLAN
BUILD
VALIDATE
ORCHESTRATE

LICENSE:
PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections


import { Capability, WorkflowRole } from "./capability-vocab.js";

export type JobType =
  | "build_app"
  | "deploy_app"
  | "write_blog"
  | "generate_brand_kit"
  | "run_seo_audit"
  | "schedule_posts"
  | "analyze_logs"
  | "heal_system"
  | "verify_release"
  | "unknown";

export interface JobStep {
  id: string;
  name: string;
  required_capabilities: Capability[];
  required_roles: WorkflowRole[];
  inputs: string[]; // Refs into Memory Lake (session/mission/canonical)
  outputs: string[]; // Refs where results will be stored
  retry_policy: {
    max_attempts: number;
    backoff_ms: number;
  };
  fallback_chain: string[]; // List of alternative agent IDs
}

export interface UniversalJob {
  job_id: string;
  type: JobType;
  status: "pending" | "running" | "completed" | "failed" | "aborted";
  steps: JobStep[];
  current_step_index: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ExecutionEvent {
  event_type: "TOOL_CALL_REQUESTED" | "TOOL_CALL_COMPLETED" | "STEP_STARTED" | "STEP_FINISHED" | "JOB_ERROR";
  agent_id: string;
  job_id: string;
  step_id: string;
  tool_name?: string;
  payload?: any;
  duration_ms?: number;
  timestamp: string;
}
