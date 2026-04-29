/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: CORE.LAUNCHPAD.CONTRACTS
TAG: CORE.LAUNCHPAD.TYPES

5WH:
WHAT = Canonical TypeScript data contracts for the Launch Pad system
WHY = Single source of truth for Launch, Bundle, Job, Event, and Provider types
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = core/launchpad/types.ts
WHEN = 2026
HOW = Pure TypeScript interfaces + union types — no runtime deps

LICENSE: MIT
*/

// ── Launch Types ────────────────────────────────────────────────

export type LaunchType =
  | 'marketing_site'
  | 'web_app'
  | 'digital_product'
  | 'music_drop'
  | 'social_campaign'
  | 'seo_package'
  | 'ad_campaign';

export type LaunchStatus = 'draft' | 'running' | 'live' | 'failed' | 'archived';

export type LaunchSource = 'code_studio' | 'creators_studio' | 'mixed';

export interface PrimaryLink {
  label: string;
  url: string;
}

export interface LaunchRecord {
  id: string;
  created_at: number;
  updated_at: number;
  title: string;
  type: LaunchType;
  status: LaunchStatus;
  source: LaunchSource;
  workspace_id?: string;
  creators_project_id?: string;
  primary_links: PrimaryLink[];
  last_job_id?: string;
}

// ── Bundle Types ────────────────────────────────────────────────

export interface FileIndex {
  path: string;
  bytes: number;
  sha256: string;
  mime?: string;
}

export interface AssetIndex {
  id: string;
  kind: 'image' | 'audio' | 'video' | 'document' | 'archive' | 'other';
  name: string;
  bytes: number;
  sha256: string;
}

export interface EnvSchema {
  key: string;
  required: boolean;
  description?: string;
  secret?: boolean;
}

export interface BundleManifest {
  kind: 'static_site' | 'fullstack_node' | 'digital_product_bundle';
  package_manager?: 'npm' | 'pnpm' | 'yarn' | 'bun';
  install_cmd?: string;
  build_cmd?: string;
  start_cmd?: string;
  output_dir?: string;
  env_schema: EnvSchema[];
}

export interface DeployableBundle {
  id: string;
  launch_id: string;
  created_at: number;
  files_snapshot: FileIndex[];
  assets: AssetIndex[];
  manifest: BundleManifest;
}

// ── Job Types ───────────────────────────────────────────────────

export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled';
export type PipelineStep = 'validate' | 'build' | 'package' | 'publish' | 'verify' | 'announce';

export interface PipelineStepRecord {
  step: PipelineStep;
  status: JobStatus;
  started_at?: number;
  ended_at?: number;
  detail?: string;
}

export interface LaunchJob {
  id: string;
  launch_id: string;
  bundle_id: string;
  status: JobStatus;
  mode: 'build_only' | 'publish_only' | 'full_launch';
  pipeline_steps: PipelineStepRecord[];
  trace_id: string;
  created_at: number;
  updated_at: number;
}

// ── Trace / Event Types ─────────────────────────────────────────

export type TraceSeverity = 'debug' | 'info' | 'warn' | 'error';

export interface TraceEvent {
  trace_id: string;
  span_id: string;
  type: string;
  severity: TraceSeverity;
  payload: Record<string, unknown>;
  source: string;
  created_at: number;
}

// ── Provider Types ──────────────────────────────────────────────

export type ProviderId =
  | 'vercel'
  | 'netlify'
  | 'cloudflare_pages'
  | 'stripe'
  | 'gumroad'
  | 'github'
  | 'twitter'
  | 'youtube';

export interface ProviderConnection {
  provider_id: ProviderId;
  label: string;
  status: 'connected' | 'not_connected' | 'error';
  scopes: string[];
  last_tested_at?: number;
  // NEVER store raw tokens here — reference only
  token_ref?: string;
}
