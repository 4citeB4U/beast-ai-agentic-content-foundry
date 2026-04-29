/* LEEWAY HEADER

REGION: UI
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
TAG: UI.COMPONENT.AGENT_NOTEPAD
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: folder-tree
ICON_SIG: AN900
5WH: WHAT=Agent Lee Notepad OS - File Explorer & Management System;
WHY=Provide LEONARD drive model with familiar file explorer UX;
WHO=LeeWay Core;
WHERE=src/components/AgentNotepad.tsx;
WHEN=2025-11-01;
HOW=React + TypeScript + local AI integration
SPDX-License-Identifier: MIT
*/

/// <reference types="vite/client" />
import React, { Component, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './AgentNotepad.css';
import { PersonaHealthPanel } from '../src/ui/diagnostics/PersonaHealthPanel';

// =================================================================================
// GLOBAL TYPE DECLARATIONS
// =================================================================================

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey(): Promise<boolean>;
      openSelectKey(): Promise<void>;
    };
    AgentLeePersonaEngine?: {
      respond: (
        schemaType: string,
        stateValue: string,
        context?: Record<string, unknown>,
        opts?: Record<string, unknown>
      ) => { text: string };
      getPersonalityState?: () => Record<string, unknown>;
    };
    AgentLeePoetryBank?: {
      get: (key: string) => string[];
      keys: () => string[];
    };
    AgentLeeLingoWorker?: {
      refreshSlangPack: (args: {
        mlAdapter: {
          getFile: (path: string) => Promise<unknown>;
          putFile: (path: string, name: string, payload: unknown, meta?: Record<string, unknown>) => Promise<unknown>;
        };
        providers: unknown[];
      }) => Promise<unknown>;
      ExampleProviders: Record<string, unknown>;
    };
    __agentleeSuperiorPrompt?: string;
    __agentleeModules?: {
      loaded: string[];
      failed: string[];
    };
  }
}

type PersonaSchemaType = 'workerTaskLog' | 'userSentimentProfile' | 'inputErrorRecoverySchema';

const PERSONA_MODULE_PATHS = {
  poetry: '/Agent_Lee_Persona_System/03_POETRY/agentlee_poetry_bank.js',
  engine: '/Agent_Lee_Persona_System/02_ENGINE/agentlee_persona_engine_v1_1.js',
  lingo: '/Agent_Lee_Persona_System/04_LINGO/agentlee_lingo_worker.js',
  superiorPrompt: '/Agent_Lee_Persona_System/01_SUPERIOR_PROMPT/Agent_Lee_Superior_Prompt.md',
} as const;

const loadRuntimeScript = async (path: string): Promise<boolean> => {
  try {
    await import(/* @vite-ignore */ `${path}?ts=${Date.now()}`);
    return true;
  } catch {
    return new Promise<boolean>((resolve) => {
      const existing = document.querySelector(`script[data-agentlee-src="${path}"]`) as HTMLScriptElement | null;
      if (existing) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = `${path}?ts=${Date.now()}`;
      script.async = true;
      script.dataset.agentleeSrc = path;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  }
};

const loadPersonaModules = async (): Promise<{ loaded: string[]; failed: string[] }> => {
  const loaded: string[] = [];
  const failed: string[] = [];

  const moduleLoadOrder: Array<[string, string]> = [
    ['poetry', PERSONA_MODULE_PATHS.poetry],
    ['engine', PERSONA_MODULE_PATHS.engine],
    ['lingo', PERSONA_MODULE_PATHS.lingo],
  ];

  for (const [name, path] of moduleLoadOrder) {
    const ok = await loadRuntimeScript(path);
    if (ok) {
      loaded.push(name);
    } else {
      failed.push(name);
    }
  }

  window.__agentleeModules = { loaded, failed };
  return { loaded, failed };
};

const loadSuperiorPrompt = async (): Promise<string> => {
  try {
    const response = await fetch(PERSONA_MODULE_PATHS.superiorPrompt, { cache: 'no-cache' });
    if (!response.ok) {
      return '';
    }
    const content = await response.text();
    return content.trim();
  } catch {
    return '';
  }
};

const mapCapabilityToPersonaSchema = (capability: string): { schemaType: PersonaSchemaType; stateValue: string } => {
  const capabilityNormalized = capability.toLowerCase();
  const creativeIntent = ['rewrite', 'auto-refactor', 'generate', 'draft'];

  if (creativeIntent.some((token) => capabilityNormalized.includes(token))) {
    return { schemaType: 'userSentimentProfile', stateValue: 'user_excited' };
  }

  return { schemaType: 'workerTaskLog', stateValue: 'task_complete' };
};

const applyPersonaResponse = (
  text: string,
  capability: string,
  options?: { failed?: boolean; errorMessage?: string }
): string => {
  const engine = window.AgentLeePersonaEngine;
  if (!engine || typeof engine.respond !== 'function') {
    return text;
  }

  const { schemaType, stateValue } = options?.failed
    ? { schemaType: 'workerTaskLog' as const, stateValue: 'task_failed' }
    : mapCapabilityToPersonaSchema(capability);

  const contextualized = options?.failed && options.errorMessage
    ? `Analysis failed: ${options.errorMessage}\n\n${text}`
    : text;

  const result = engine.respond(
    schemaType,
    stateValue,
    {
      creativeMode: capability.toLowerCase().includes('rewrite') || capability.toLowerCase().includes('generate'),
      intent: capability,
      flavorLevel: 2,
      poetryLevel: 2,
      useWe: true,
    },
    {
      mode: 'Charming_Professional',
      deterministic: true,
    }
  );

  const personaText = typeof result?.text === 'string' ? result.text.trim() : '';
  if (!personaText) {
    return contextualized;
  }

  return `${personaText}\n\n${contextualized}`;
};

// =================================================================================
// ERROR BOUNDARY
// =================================================================================

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class AgentNotepadErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('AgentNotepad Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-red-50">
          <div className="text-center p-8 max-w-md">
            <i className="fa-solid fa-triangle-exclamation text-6xl text-red-500 mb-4"></i>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Something went wrong</h1>
            <p className="text-gray-600 mb-4">{this.state.error?.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// =================================================================================
// AGENT LEE TODO SERVICE (from services/agentLeeTodo.ts)
// =================================================================================

/* LEEWAY HEADER — DO NOT REMOVE
region: ui.lib.planner.todo.v2
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_ASCII: family=lucide glyph=check-square ICON_SIG=TD900
5WH: WHAT=Agent Lee To-Do Planner (every "task" becomes a file: plan+checklist);
WHY=Marry persona + prompts + file-drives: auto-create to-do plans from any instruction, store as files (R/A/L/LEE/D, heavies E/O), LEEWAY-aligned;
WHO=RapidWebDevelop; WHERE:D:\agentlee\frontend\src\lib\planner\agent-lee-todo.ts; WHEN=2025-10-05;
HOW=Pure TypeScript, no deps; plug adapters for LLM + FS; default heuristics per playbook
SIG: 00000000
AGENTS: ANY
SPDX-License-Identifier: MIT
*/

// region adapters (no lock-in) -----------------------------------------------

type DriveKey = "L"|"E"|"O"|"N"|"A"|"R"|"D"|"LEE";

interface FSAdapter {
  putFile: (args: {
    drive_key: DriveKey; human_name: string; type?: "file" | string; stage?: string;
    content?: any; tags?: string[]; priority?: "low"|"normal"|"high"; path?: string;
    retention?: { policy: "short"|"mid"|"forever"; ttl_days?: number };
    critical?: boolean; next_fire_at?: string|null;
  }) => Promise<{ id: string; drive_key: DriveKey }>;
  linkFile?: (ownerId: string, toDrive: DriveKey, targetId: string, relation: string) => Promise<void>;
}

interface LLMClient {
  generate(prompt: string, opts?: { maxTokens?: number; temperature?: number; [k:string]:any }): Promise<string>;
}

// Injected at runtime by your app
let FS: FSAdapter | null = null;
let LLM: LLMClient | null = null;
function setFSAdapter(fs: FSAdapter){ FS = fs; }
function setLLMAdapter(llm: LLMClient){ LLM = llm; }

// region constants & LEEWAY guards -------------------------------------------

const DRIVE_LABELS: Record<DriveKey,string> = {
  L:"Drive L", E:"Drive E", O:"Drive O", N:"Drive N", A:"Drive A", R:"Drive R", D:"Drive D", LEE:"Drive Lee"
};

const LEEWAY = {
  version: "v10+",
  principles: [
    "Model-agnostic; no specific model names.",
    "System-agnostic; browser-first with graceful fallbacks.",
    "Every task is a file. One physical store; eight logical drives.",
    "Use journaling/retention/security; never drop data.",
    "Human-readable names by default; coded allowed for critical with consent.",
    "Budget/time/constraints honored; verify before spend.",
    "Learning loop: failures → D outcome + A PlanFix."
  ]
} as const;

function nowISO(){ return new Date().toISOString(); }
function ensureFS(){ if(!FS) throw new Error("FSAdapter not set. Call setFSAdapter(...) first."); }

// region types ----------------------------------------------------------------

type Priority = "low"|"normal"|"high";
type TodoStatus = "todo"|"in_progress"|"blocked"|"done"|"deferred";

interface TodoItem {
  id: string;
  title: string;
  detail?: string;
  status: TodoStatus;
  evidence?: string;        // link/id of artifacts, logs, screenshots
  dependsOn?: string[];     // other TodoItem ids
  estimate?: { minutes?: number };
  dueAt?: string|null;
  createdAt: string;
  updatedAt: string;
}

interface TodoPlan {
  planId: string;
  humanTitle: string;       // user-readable name (used as file name)
  intent: string;           // extracted intent
  assumptions: string[];    // small set of reasonable assumptions
  constraints: string[];    // budget/time/safety/etc
  contextNotes: string[];   // what was read/loaded
  lifecycle: "R→A→(E/O)→N + D logs";
  steps: TodoItem[];        // the checklist
  successCriteria: string[];// one-liner success state(s)
  nextActionHint: string;   // what to do first
  createdAt: string;
  updatedAt: string;
}

// region heuristic plan builder (your playbook) -------------------------------

let _uidSeq = 0;
function uid(prefix="T"){ return `${prefix}${(++_uidSeq).toString(36)}_${Math.random().toString(36).slice(2,7)}`; }

interface BuildOptions {
  priority?: Priority;
  dueAt?: string|null;
  budgetUSD?: number|null;
  allowNetwork?: boolean;
  requireUserConfirm?: boolean;
  multiUser?: boolean;
  deliveryWindow?: string|null;
  categoryHint?: string;      // e.g., "Scheduling", "Procure", "Project"
}

function buildTodoPlan(input: {
  instruction: string;
  context?: string;
  categoryHint?: string;
  budgetUSD?: number|null;
  deliveryWindow?: string|null;
  requireUserConfirm?: boolean;
}): TodoPlan {
  const created = nowISO();
  const humanTitle = humanizeTitle(input.instruction);
  const assumptions: string[] = [];
  const constraints: string[] = [];
  const contextNotes: string[] = [];

  // heuristics per your playbook
  // 1) intake & intent extraction
  const intent = extractIntent(input.instruction, input.categoryHint);

  // 2) assumptions (max 2)
  if (/packers|game|watch/i.test(input.instruction)) assumptions.push("Finger foods & drinks preferred for couch viewing");
  if (input.deliveryWindow) assumptions.push(`Delivery should arrive before ${input.deliveryWindow}`);

  // 3) constraints
  if (typeof input.budgetUSD === "number") constraints.push(`Budget ≤ $${input.budgetUSD.toFixed(0)}`);
  if (input.requireUserConfirm) constraints.push("Require user confirmation before purchases");

  // 4) plan decomposition (checklist)
  const steps: TodoItem[] = decomposeToChecklist(input.instruction, intent, input);

  // 5) success criteria + next action
  const successCriteria = deriveSuccessCriteria(intent, input);
  const nextActionHint = steps[0]?.title || "Open plan";

  return {
    planId: uid("PLAN"),
    humanTitle,
    intent,
    assumptions,
    constraints,
    contextNotes,
    lifecycle: "R→A→(E/O)→N + D logs",
    steps,
    successCriteria,
    nextActionHint,
    createdAt: created,
    updatedAt: created
  };
}

function humanizeTitle(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^[a-z]/, s => s.toUpperCase())
    .replace(/\.$/, "");
}

function extractIntent(instruction: string, hint?: string): string {
  if (hint) return hint;
  if (/remind|schedule|calendar|event/i.test(instruction)) return "Scheduling";
  if (/buy|order|basket|budget|price|delivery/i.test(instruction)) return "Procure";
  if (/project|sprint|code|review|deploy|feature/i.test(instruction)) return "Project";
  return "General";
}

function decomposeToChecklist(instr: string, intent: string, i: {budgetUSD?:number|null, deliveryWindow?:string|null}): TodoItem[] {
  const t = (title: string, detail?: string): TodoItem => ({
    id: uid("STEP"),
    title, detail,
    status: "todo",
    createdAt: nowISO(),
    updatedAt: nowISO()
  });

  // Base skeleton from your playbook
  const core: TodoItem[] = [
    t("Intake & intent extraction", "Parse explicit + implicit requirements; make ≤2 assumptions."),
    t("Decompose into actionable units", "Minimal steps that show progress."),
    t("Context acquisition (just enough)"),
    t("Plan → act loop: mark one in-progress", "Execute smallest safe change; minimal diff."),
    t("Validation & quality gates", "Types/syntax/quick runtime checks."),
    t("Incremental feedback hooks", "Summarize deltas after 3–5 tool actions."),
    t("Traceability & auditability", "LEEEWAY headers; structured changes."),
    t("Completion & handoff", "Map requirements to Done/Deferred; propose next options.")
  ];

  // Specializations
  if (intent === "Scheduling") {
    core.unshift(t("Time normalization", "Prefer absolute dates and local TZ; avoid fuzzy 'tomorrow'."));
  }
  if (intent === "Procure") {
    if (typeof i.budgetUSD === "number") core.unshift(t(`Enforce budget ≤ $${i.budgetUSD.toFixed(0)}`, "Prefer frugal combos; price caps."));
    if (i.deliveryWindow) core.unshift(t(`Ensure delivery ETA before ${i.deliveryWindow}`, "Prefer vendors with on-time reliability."));
    core.push(t("Vendor shortlist", "2–3 options with price + ETA; substitutions ready."));
    core.push(t("Approval checkpoint", "Summarize basket; require confirmation before purchase."));
  }
  if (intent === "Project") {
    core.unshift(t("Define acceptance tests", "One-liners to verify feature success."));
    core.splice(3,0,t("Create/edit minimal modules", "Types → adapters → API → wire → UI"));
  }
  return core;
}

function deriveSuccessCriteria(intent: string, i: {budgetUSD?:number|null, deliveryWindow?:string|null}): string[] {
  const base = ["All checklist items are 'done'.", "No new errors introduced."];
  if (intent === "Scheduling") base.push("Event reminders present with correct absolute time.");
  if (intent === "Procure") {
    if (typeof i.budgetUSD === "number") base.push(`Total cost ≤ $${i.budgetUSD.toFixed(0)} including fees/tax.`);
    if (i.deliveryWindow) base.push(`ETA before ${i.deliveryWindow}.`);
  }
  if (intent === "Project") base.push("Acceptance tests pass; diffs minimal and traceable.");
  return base;
}

// region persistence to LEONARD + Lee (files, not "tasks") -------------------

interface PersistResult {
  planFileId: string;       // A drive
  workingFileId: string;    // R drive
  uiArtifactId: string;     // L drive
  systemRegId: string;      // LEE drive
  securityLogId: string;    // D drive
}

/**
 * Persist a TodoPlan as FILES across the logical drives.
 * R: working copy (short) | A: plan (mid) | L: UI artifact | LEE: registry | D: security log
 * Heavies (attachments) can later go to E/O via your FS API.
 */
async function persistPlan(plan: TodoPlan, opts?: { priority?: Priority; tags?: string[] }): Promise<PersistResult> {
  ensureFS();
  const priority = opts?.priority ?? "normal";
  const tags = ["plan","todo","leeway", ...(opts?.tags ?? [])];
  const path = (FS as any).getCurrentPath ? (FS as any).getCurrentPath() : undefined;


  // A — authoritative plan
  const A = await FS!.putFile({
    drive_key: "A", type: "file", stage: "mid",
    human_name: `Plan — ${plan.humanTitle}`,
    content: plan, tags, priority, retention: { policy: "mid", ttl_days: 120 }, path
  });

  // R — working set (mutable subset for quick updates)
  const working = {
    planId: plan.planId,
    stepIds: plan.steps.map(s => s.id),
    statuses: Object.fromEntries(plan.steps.map(s => [s.id, s.status] as const)),
    nextActionHint: plan.nextActionHint,
    lastOpenedAt: nowISO()
  };
  const R = await FS!.putFile({
    drive_key: "R", type: "file", stage: "short",
    human_name: `Working — ${plan.humanTitle}`,
    content: working, tags: [...tags, "working"], priority, retention: { policy: "short", ttl_days: 14 }, path
  });

  // L — UI artifact (render hint)
  const L = await FS!.putFile({
    drive_key: "L", type: "file", stage: "ui",
    human_name: `UI — ${plan.humanTitle}`,
    content: { ui_hint: "render:todo_plan", planRef: A.id, workingRef: R.id },
    tags: [...tags, "ui"], priority, path
  });

  // LEE — system registry
  const LEE = await FS!.putFile({
    drive_key: "LEE", type: "file", stage: "system",
    human_name: `Registry — ${plan.planId}`,
    content: { kind: "todo_plan", planRef: A.id, workingRef: R.id, createdAt: plan.createdAt },
    tags: [...tags, "system"], priority, critical: false, path
  });

  // D — security log
  const D = await FS!.putFile({
    drive_key: "D", type: "file", stage: "security",
    human_name: `Log — Plan Created — ${plan.planId}`,
    content: { event: "plan_created", planId: plan.planId, planFileId: A.id, workingFileId: R.id },
    tags: [...tags, "security"], priority, path
  });

  // soft links if available
  if (FS!.linkFile) {
    await FS!.linkFile(A.id, "R", R.id, "working_of");
    await FS!.linkFile(R.id, "L", L.id, "ui_for");
    await FS!.linkFile(A.id, "LEE", LEE.id, "registry_for");
    await FS!.linkFile(A.id, "D", D.id, "security_for");
  }

  return { planFileId: A.id, workingFileId: R.id, uiArtifactId: L.id, systemRegId: LEE.id, securityLogId: D.id };
}

// region updates: start/complete/blocked/deferred -----------------------------

async function markInProgress(workingFileId: string, stepId: string){
  ensureFS();
  // Store a small delta record in R (pattern: append-only update files to avoid conflicts)
  await FS!.putFile({
    drive_key: "R", type: "file", stage: "short",
    human_name: `Update — In-Progress — ${stepId}`,
    content: { stepId, status: "in_progress", at: nowISO(), workingRef: workingFileId },
    tags: ["todo","update","leeway"], priority: "normal", retention: { policy: "short", ttl_days: 14 }
  });
}

async function markDone(workingFileId: string, stepId: string, evidence?: string){
  ensureFS();
  await FS!.putFile({
    drive_key: "R", type: "file", stage: "short",
    human_name: `Update — Done — ${stepId}`,
    content: { stepId, status: "done", evidence, at: nowISO(), workingRef: workingFileId },
    tags: ["todo","update","leeway"], priority: "normal", retention: { policy: "short", ttl_days: 14 }
  });
  // D outcome log (learning loop)
  await FS!.putFile({
    drive_key: "D", type: "file", stage: "security",
    human_name: `Outcome — Step — ${stepId}`,
    content: { stepId, success: true, at: nowISO(), workingRef: workingFileId },
    tags: ["outcome","leeway"], priority: "normal"
  });
}

async function markBlocked(workingFileId: string, stepId: string, reason: string){
  ensureFS();
  await FS!.putFile({
    drive_key: "R", type: "file", stage: "short",
    human_name: `Update — Blocked — ${stepId}`,
    content: { stepId, status: "blocked", reason, at: nowISO(), workingRef: workingFileId },
    tags: ["todo","update","blocked","leeway"], priority: "normal", retention: { policy: "short", ttl_days: 14 }
  });
}

async function markDeferred(workingFileId: string, stepId: string, reason: string){
  ensureFS();
  await FS!.putFile({
    drive_key: "R", type: "file", stage: "short",
    human_name: `Update — Deferred — ${stepId}`,
    content: { stepId, status: "deferred", reason, at: nowISO(), workingRef: workingFileId },
    tags: ["todo","update","deferred","leeway"], priority: "normal", retention: { policy: "short", ttl_days: 14 }
  });
}

// region optional: auto-outline via LLM (still model-agnostic) ----------------

async function refinePlanWithLLM(plan: TodoPlan, extraContext?: string): Promise<TodoPlan> {
  if (!LLM) return plan; // adapter not installed → noop
  const prompt = [
    "You are Agent Lee following LEEWAY standards.",
    "Given a to-do plan, tighten steps to be minimal, verifiable, and ordered; add at most 2 missing steps.",
    "Respect budgets/times. Avoid scope creep. Keep names human-readable.",
    `PLAN:\n${JSON.stringify(plan, null, 2)}`,
    extraContext ? `CONTEXT:\n${extraContext}` : ""
  ].join("\n\n");
  const out = await LLM.generate(prompt, { maxTokens: 700, temperature: 0.2 });
  try {
    const suggest = JSON.parse(safeExtractJSON(out) || "{}");
    if (Array.isArray(suggest.steps)) {
      const updated: TodoPlan = { ...plan, steps: normalizeSteps(suggest.steps), updatedAt: nowISO() };
      return updated;
    }
  } catch { /* keep original plan */ }
  return plan;
}

function safeExtractJSON(s: string): string | null {
  const m = s.match(/\{[\s\S]*\}$/);
  return m ? m[0] : null;
}
function normalizeSteps(steps: any[]): TodoItem[] {
  return steps.slice(0, 20).map((raw, i) => ({
    id: raw.id || uid("STEP"),
    title: String(raw.title ?? `Step ${i+1}`),
    detail: raw.detail ? String(raw.detail) : undefined,
    status: ["todo","in_progress","blocked","done","deferred"].includes(raw.status) ? raw.status : "todo",
    evidence: raw.evidence ? String(raw.evidence) : undefined,
    dependsOn: Array.isArray(raw.dependsOn) ? raw.dependsOn.map(String) : undefined,
    estimate: raw.estimate && typeof raw.estimate.minutes === "number" ? { minutes: raw.estimate.minutes } : undefined,
    dueAt: raw.dueAt || null,
    createdAt: raw.createdAt || nowISO(),
    updatedAt: nowISO()
  }));
}

// region helpers: turnkey API for ONE instruction -----------------------------

async function planAndPersist(instruction: string, options?: BuildOptions){
  const plan = buildTodoPlan({
    instruction,
    categoryHint: options?.categoryHint,
    budgetUSD: options?.budgetUSD ?? null,
    deliveryWindow: options?.deliveryWindow ?? null,
    requireUserConfirm: options?.requireUserConfirm ?? false
  });
  const result = await persistPlan(plan, { priority: options?.priority ?? "normal" });
  return { plan, result };
}

// region examples -------------------------------------------------------------

/** Example 1 — Packers watch party (scheduling + procure fused) */
async function demoPackers(){
  return planAndPersist(
    "Set a reminder for Sunday's Packers game and prepare a $70 party for 4: beer, nachos, chicken; delivery before kickoff.",
    { categoryHint: "Scheduling", budgetUSD: 70, deliveryWindow: "before kickoff", priority: "high", requireUserConfirm: true }
  );
}

/** Example 2 — Autosave layer project (project intent) */
async function demoAutosave(){
  return planAndPersist(
    "Implement an autosave layer with debounced snapshots, adapters, and restore flow; keep diffs minimal; add headers.",
    { categoryHint: "Project", priority: "normal" }
  );
}

// region export ---------------------------------------------------------------

const AgentLeeTodo = {
  setFSAdapter, setLLMAdapter,
  buildTodoPlan, persistPlan,
  markInProgress, markDone, markBlocked, markDeferred,
  refinePlanWithLLM,
  planAndPersist,
  demoPackers, demoAutosave,
  DRIVE_LABELS
};

// =================================================================================
// APPLICATION TYPES (from types.ts)
// =================================================================================

interface FileItem {
  id: string;
  name: string;
  type: 'folder' | 'plan' | 'working' | 'ui' | 'system' | 'security' | 'text' | string;
  modified: string;
  location: string;
  path: string;
  content?: any;
  isDeleted?: boolean;
  originalPath?: string;
}

interface Drive {
  key: DriveKey;
  label: string;
  icon: ReactNode;
}

type Clipboard = {
  fileIds: string[];
  operation: 'copy' | 'cut';
} | null;

// =================================================================================
// MOCK FILE SYSTEM (from services/mockFsAdapter.ts)
// =================================================================================

class MockFsAdapter implements FSAdapter {
  private fileSystem: Record<string, FileItem> = {};
  private idCounter = 0;
  private currentPath: string = 'Home'; // Track current path for plan persistence

  private generateId() {
    return `file_${this.idCounter++}_${Date.now()}`;
  }

  public getFile(id: string): FileItem | undefined {
    return this.fileSystem[id] ? { ...this.fileSystem[id] } : undefined;
  }

  public renameFile(id: string, newName: string) {
    if (this.fileSystem[id]) {
      this.fileSystem[id].name = newName;
      this.fileSystem[id].modified = new Date().toISOString();
      console.log(`[MockFS] Renamed ${id} to ${newName}`);
    }
  }

  public deleteFile(id: string) {
    const file = this.fileSystem[id];
    if (file) {
      file.isDeleted = true;
      file.originalPath = file.path;
      file.path = 'Trash'; // Conceptually move to trash
      file.modified = new Date().toISOString();
      console.log(`[MockFS] Soft-deleted ${id}`);
    }
  }

  public permanentlyDeleteFile(id: string) {
    if (this.fileSystem[id]) {
      delete this.fileSystem[id];
      console.log(`[MockFS] Permanently deleted ${id}`);
    }
  }

  public restoreFile(id: string) {
    const file = this.fileSystem[id];
    if (file && file.isDeleted) {
      file.path = file.originalPath!;
      delete file.isDeleted;
      delete file.originalPath;
      file.modified = new Date().toISOString();
      console.log(`[MockFS] Restored ${id} to ${file.path}`);
    }
  }

  public setCurrentPath(path: string) {
    this.currentPath = path;
  }

  public getCurrentPath(): string {
      return this.currentPath;
  }

  public moveFiles(fileIds: string[], destinationPath: string) {
    const destinationDrive = destinationPath.split(':')[0] as DriveKey;
    fileIds.forEach(id => {
      const file = this.fileSystem[id];
      if (file) {
        if (file.path === destinationPath) {
          return;
        }
        if (file.type === 'folder' && destinationPath.startsWith(`${file.path}${file.name}/`)) {
          console.warn(`Cannot move folder '${file.name}' into itself.`);
          return;
        }
        file.path = destinationPath;
        file.location = `${destinationDrive}:\\`;
        file.modified = new Date().toISOString();
        console.log(`[MockFS] Moved ${id} to ${destinationPath}`);
      }
    });
  }

  async putFile(args: {
    drive_key: DriveKey;
    human_name: string;
    type?: string;
    stage?: string;
    content?: any;
    tags?: string[];
    priority?: "low" | "normal" | "high";
    path?: string;
    retention?: { policy: "short" | "mid" | "forever"; ttl_days?: number };
    critical?: boolean;
    next_fire_at?: string | null;
  }): Promise<{ id: string; drive_key: DriveKey }> {
    const id = this.generateId();
    const filePath = args.path || `${args.drive_key}:/`;

    let fileType = args.type || 'text';
    if(args.tags?.includes('plan')) fileType = 'plan';
    else if(args.tags?.includes('working')) fileType = 'working';
    else if(args.tags?.includes('ui')) fileType = 'ui';
    else if(args.tags?.includes('system')) fileType = 'system';
    else if(args.tags?.includes('security')) fileType = 'security';
    else if(args.tags?.includes('folder')) fileType = 'folder';

    const newFile: FileItem = {
      id,
      name: args.human_name,
      type: fileType,
      modified: new Date().toISOString(),
      location: `${args.drive_key}:\\`,
      path: filePath,
      content: args.content,
    };

    this.fileSystem[id] = newFile;

    // console.log(`[MockFS] Created ${fileType}: ${newFile.name} in ${newFile.path}`);

    return { id, drive_key: args.drive_key };
  }

  async linkFile(ownerId: string, toDrive: DriveKey, targetId: string, relation: string): Promise<void> {
    console.log(`[MockFS] Linking ${ownerId} -> ${targetId} (${relation})`);
    return Promise.resolve();
  }

  getAllFiles(): Record<string, FileItem> {
    return { ...this.fileSystem };
  }

  updateFileContent(fileId: string, content: string) {
    if (this.fileSystem[fileId]) {
      try {
        this.fileSystem[fileId].content = JSON.parse(content);
      } catch (e) {
        this.fileSystem[fileId].content = content;
      }
      this.fileSystem[fileId].modified = new Date().toISOString();
      console.log(`[MockFS] Updated content for file: ${fileId}`);
    }
  }

  async initializeDemoData() {
    if (Object.keys(this.fileSystem).length > 0) return;
    console.log('[MockFS] Initializing Demo Data...');

    // Helper to create folders and return path
    const createFolderRecursive = async (basePath: string, folderName: string) => {
        const drive = basePath.split(':')[0] as DriveKey;
        await this.putFile({ drive_key: drive, human_name: folderName, type: 'folder', path: basePath, tags: ['folder']});
        return `${basePath}${folderName}/`;
    };

    const docsPath = await createFolderRecursive('D:/', 'Documents');
    await this.putFile({ drive_key: 'D', human_name: 'Project Brief.docx', type: 'docx', path: docsPath, content: 'Project Alpha brief...' });
    await this.putFile({ drive_key: 'D', human_name: 'Meeting Notes.txt', type: 'text', path: docsPath, content: 'Q4 planning meeting notes.' });
    await this.putFile({ drive_key: 'D', human_name: 'Annual Report.pdf', type: 'pdf', path: docsPath, content: '...' });


    const scriptsPath = await createFolderRecursive('L:/', 'Scripts');
    await this.putFile({ drive_key: 'L', human_name: 'data_processor.py', type: 'py', path: scriptsPath, content: 'import pandas as pd' });
    await this.putFile({ drive_key: 'L', human_name: 'deploy.sh', type: 'sh', path: scriptsPath, content: '#!/bin/bash' });


    const dataPath = await createFolderRecursive('E:/', 'Data');
    await this.putFile({ drive_key: 'E', human_name: 'user_profiles.json', type: 'json', path: dataPath, content: '[{"user": "lee"}]' });
    await this.putFile({ drive_key: 'E', human_name: 'sales_data.csv', type: 'csv', path: dataPath, content: 'id,amount\n1,100' });


    const musicPath = await createFolderRecursive('E:/', 'Music');
    await this.putFile({ drive_key: 'E', human_name: 'ambient_chill.mp3', type: 'mp3', path: musicPath, content: null });
    await this.putFile({ drive_key: 'E', human_name: 'focus_flow.wav', type: 'wav', path: musicPath, content: null });

    const soundtracksPath = await createFolderRecursive('A:/', 'Soundtracks');
    await this.putFile({ drive_key: 'A', human_name: 'cinematic_score.mp3', type: 'mp3', path: soundtracksPath, content: null });

    const picsPath = await createFolderRecursive('N:/', 'Pictures');
    const vacationPath = await createFolderRecursive(picsPath, 'Vacation');
    await this.putFile({ drive_key: 'N', human_name: 'beach_sunset.jpg', type: 'jpg', path: vacationPath, content: 'base64...' });
    await this.putFile({ drive_key: 'N', human_name: 'mountain_hike.png', type: 'png', path: vacationPath, content: 'base64...' });
    await this.putFile({ drive_key: 'N', human_name: 'logo.svg', type: 'svg', path: picsPath, content: null });


    const videosPath = await createFolderRecursive('N:/', 'Videos');
    await this.putFile({ drive_key: 'N', human_name: 'product_demo.mp4', type: 'mp4', path: videosPath, content: null });

    const downloadsPath = await createFolderRecursive('D:/', 'Downloads');
    await this.putFile({ drive_key: 'D', human_name: 'archive.zip', type: 'zip', path: downloadsPath, content: null });

    // Original demo plans
    this.setCurrentPath('A:/');
    await AgentLeeTodo.demoAutosave();
    this.setCurrentPath('R:/');
    await AgentLeeTodo.demoPackers();
    this.setCurrentPath('Home');
    console.log('[MockFS] Demo Data Initialized.');
  }
}

const mockFsAdapter = new MockFsAdapter();


// =================================================================================
// LOCAL CONTENT ANALYSIS HOOK
// =================================================================================

const useLocalAnalyzer = () => {
  const superiorPromptRef = useRef<string>('');

    useEffect(() => {
    const initialize = async () => {
      try {
        await loadPersonaModules();
        const superiorPrompt = await loadSuperiorPrompt();
        superiorPromptRef.current = superiorPrompt;
        window.__agentleeSuperiorPrompt = superiorPrompt;

        if (window.AgentLeeLingoWorker?.refreshSlangPack && window.AgentLeeLingoWorker.ExampleProviders?.staticSeed) {
          const lingoPath = '/lexicon/slang_pack.json';
          const lingoFileName = 'slang_pack.json';
          const lingoFolderPath = 'L:/Lexicon/';

          const mlAdapter = {
            getFile: async (path: string) => {
              const existing = Object.values(mockFsAdapter.getAllFiles()).find(
                (file) => file.path === lingoFolderPath && file.name === lingoFileName
              );
              if (!existing) {
                throw new Error(`No lexicon file found for ${path}`);
              }
              return existing.content;
            },
            putFile: async (_path: string, name: string, payload: unknown) => {
              const created = await mockFsAdapter.putFile({
                drive_key: 'L',
                human_name: name,
                type: 'json',
                path: lingoFolderPath,
                content: payload,
                tags: ['LINGO', 'SLANG_PACK'],
              });
              return {
                ...created,
                path: lingoPath,
              };
            },
          };

          await window.AgentLeeLingoWorker.refreshSlangPack({
            mlAdapter,
            providers: [window.AgentLeeLingoWorker.ExampleProviders.staticSeed],
          });
        }
      } catch (error) {
        console.warn('Persona runtime initialization warning:', error);
      }
    };

    initialize();
    }, []);

    const analyzeContent = async (capability: string, file: FileItem) => {
        try {
            const content = typeof file.content === 'object' ? JSON.stringify(file.content, null, 2) : String(file.content);
            let baseText = '';

            switch (capability) {
              case 'Summarize': {
                const condensed = content.replace(/\s+/g, ' ').trim();
                baseText = condensed.length > 500 ? `${condensed.slice(0, 500)}...` : condensed;
                baseText = `Summary:\n${baseText}`;
                break;
              }
              case 'Rewrite': {
                baseText = `Rewrite Draft:\n${content}`;
                break;
              }
              case 'Explain Code': {
                const lineCount = content.split('\n').length;
                baseText = `Code overview: This snippet is ${lineCount} line(s) long and appears to define implementation logic with conditional and/or functional flow.\n\n${content}`;
                break;
              }
              case 'Describe Schema': {
                try {
                  const parsed = JSON.parse(content) as Record<string, unknown>;
                  const keys = Object.keys(parsed);
                  baseText = `Schema fields (${keys.length}): ${keys.join(', ')}`;
                } catch {
                  baseText = 'Unable to parse JSON schema from this content.';
                }
                break;
              }
              case 'Extract Text & Tables': {
                baseText = `Extracted content:\n${content}`;
                break;
              }
              default:
                baseText = `Action: ${capability}\n\n${content}`;
            }
            return applyPersonaResponse(baseText, capability);
        } catch (error) {
            console.error('Local content analysis error:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            return applyPersonaResponse(
              `Error analyzing content: ${errorMessage}`,
              capability,
              { failed: true, errorMessage }
            );
        }
    };

    return { analyzeContent };
};


// =================================================================================
// FILE EXPLORER HOOK (from hooks/useFileExplorer.ts)
// =================================================================================

const useFileExplorer = () => {
  const [allFiles, setAllFiles] = useState<Record<string, FileItem>>({});
  const [history, setHistory] = useState<string[]>(['Home']);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [clipboard, setClipboard] = useState<Clipboard>(null);
  const [isDocumentSearchOpen, setIsDocumentSearchOpen] = useState(false);
  const [documentSearchTerm, setDocumentSearchTerm] = useState('');

  const currentPath = history[historyIndex];

  const ORDERED_DRIVE_KEYS: DriveKey[] = ['LEE', 'L', 'E', 'O', 'N', 'A', 'R', 'D'];

  const ICONS: Record<DriveKey, React.ReactNode> = {
      L: React.createElement('i', { className: "fa-solid fa-display" }),
      E: React.createElement('i', { className: "fa-solid fa-server" }),
      O: React.createElement('i', { className: "fa-solid fa-database" }),
      N: React.createElement('i', { className: "fa-solid fa-compact-disc" }),
      A: React.createElement('i', { className: "fa-solid fa-brain" }),
      R: React.createElement('i', { className: "fa-solid fa-microchip" }),
      D: React.createElement('i', { className: "fa-solid fa-book" }),
      LEE: React.createElement('i', { className: "fa-solid fa-user-secret" }),
  };

  const DRIVES_CONFIG: Drive[] = ORDERED_DRIVE_KEYS.map(key => ({
      key,
      label: DRIVE_LABELS[key],
      icon: ICONS[key],
  }));

  const refreshFiles = useCallback(() => {
    const fsFiles = mockFsAdapter.getAllFiles();
    setAllFiles(fsFiles);
  }, []);

  useEffect(() => {
    AgentLeeTodo.setFSAdapter(mockFsAdapter);

    const initialize = async () => {
        await mockFsAdapter.initializeDemoData();
        refreshFiles();
    };
    initialize();

    // Cleanup function
    return () => {
      // Add any cleanup logic here if needed
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!currentPath.startsWith('virtual:')) {
      mockFsAdapter.setCurrentPath(currentPath);
    }
  }, [currentPath]);

  const files = useMemo(() => {
    const allVisibleFiles = Object.values(allFiles).filter((f: FileItem) => !f.isDeleted);

    if (currentPath.startsWith('virtual:')) {
        const category = currentPath.split(':')[1];
        const mediaTypes: Record<string, string[]> = {
            music: ['mp3', 'wav', 'ogg'],
            pictures: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'],
            gallery: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'],
            videos: ['mp4', 'mov', 'avi', 'webm'],
            downloads: ['zip', 'pdf', 'docx', 'xlsx'],
            documents: ['plan', 'working', 'ui', 'system', 'security', 'text', 'md', 'mdx', 'json', 'yaml', 'toml', 'py', 'sh', 'docx', 'xlsx', 'pptx', 'csv', 'sql', 'html', 'css', 'js', 'ts', 'tsx']
        };

        if (category === 'documents' && documentSearchTerm) {
             return allVisibleFiles.filter((f: FileItem) =>
                mediaTypes.documents.includes(f.type) &&
                f.name.toLowerCase().includes(documentSearchTerm.toLowerCase())
            );
        }

        const types = mediaTypes[category] || [];
        return allVisibleFiles.filter((f: FileItem) => types.includes(f.type));
    }

    if (currentPath === 'Home') return [];
    if (currentPath === 'Trash') return Object.values(allFiles).filter((f: FileItem) => f.isDeleted);

    return allVisibleFiles
        .filter((f: FileItem) => f.path === currentPath)
        .sort((a: FileItem, b: FileItem) => {
            if (a.type === 'folder' && b.type !== 'folder') return -1;
            if (a.type !== 'folder' && b.type === 'folder') return 1;
            return a.name.localeCompare(b.name);
        });
  }, [allFiles, currentPath, documentSearchTerm]);


  const navigateTo = (path: string) => {
    if (path === currentPath) return;

    if (path === 'virtual:documents') {
        setIsDocumentSearchOpen(true);
        setDocumentSearchTerm(''); // Clear previous search
        return;
    }
    setIsDocumentSearchOpen(false); // Close modal if navigating elsewhere
    setDocumentSearchTerm('');

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(path);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const searchDocuments = (term: string) => {
    setDocumentSearchTerm(term);
    setIsDocumentSearchOpen(false); // Close modal after search

    const searchPath = `virtual:documents`;
    if(currentPath !== searchPath) {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(searchPath);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }
  };


  const navigateBack = () => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
    }
  };

  const navigateForward = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
    }
  };

  const navigateUp = () => {
    if (currentPath === 'Home' || currentPath === 'Trash' || currentPath.startsWith('virtual:')) {
        navigateTo('Home');
        return;
    }

    if (!currentPath.includes('/')) {
        navigateTo('Home');
        return;
    }

    const parts = currentPath.split('/').filter(Boolean);
    if (parts.length <= 1) { // We are at the root of a drive like 'A:/'
        navigateTo('Home');
        return;
    }

    parts.pop();
    const newPath = `${parts.join('/')}/`;
    navigateTo(newPath);
  };

  const createPlan = async (instruction: string) => {
    if (currentPath === 'Home' || currentPath === 'Trash' || currentPath.startsWith('virtual:')) {
      alert("Cannot create a plan here. Please select a drive or folder first.");
      return;
    }
    await AgentLeeTodo.planAndPersist(instruction);
    refreshFiles();
  };

  const createFile = (options: { name: string; type: string; content: any; path: string; }) => {
    const { name, type, content, path } = options;
    if (path === 'Home' || path === 'Trash' || path.startsWith('virtual:')) {
      console.error("Cannot create a file in a virtual or special location.");
      return;
    }
    const drive_key = path.split(':')[0] as DriveKey;

    let finalContent: any = content;
    if (type === 'json' && typeof content === 'string') {
      try {
        finalContent = JSON.parse(content);
      } catch (e) {
        console.warn("Invalid JSON content, saving as string.", e);
      }
    }

    mockFsAdapter.putFile({ drive_key, human_name: name, path, type, content: finalContent, tags: [type] });
    refreshFiles();
  };

  const uploadFiles = (filesToUpload: { name: string, type: string, content: string | ArrayBuffer | null }[]) => {
    if (currentPath === 'Home' || currentPath === 'Trash' || currentPath.startsWith('virtual:')) {
      alert("Cannot upload files here. Please select a drive or folder first.");
      return;
    }
    const drive_key = currentPath.split(':')[0] as DriveKey;
    filesToUpload.forEach(file => {
      mockFsAdapter.putFile({
        drive_key,
        human_name: file.name,
        path: currentPath,
        type: file.type,
        content: file.content,
        tags: [file.type],
      });
    });
    refreshFiles();
  };


  const createFolder = (name: string) => {
    if (currentPath === 'Home' || currentPath === 'Trash' || currentPath.startsWith('virtual:')) {
      alert("Cannot create a folder here. Please select a drive first.");
      return;
    }
    const drive_key = currentPath.split(':')[0] as DriveKey;
    mockFsAdapter.putFile({ drive_key, human_name: name, path: currentPath, type: 'folder', content: null, tags: ['folder'] });
    refreshFiles();
  };

  const updateFileContent = (fileId: string, content: string) => {
    mockFsAdapter.updateFileContent(fileId, content);
    refreshFiles();
  };

  const deleteFiles = (fileIds: string[]) => {
    fileIds.forEach(id => mockFsAdapter.deleteFile(id));
    refreshFiles();
  };

  const permanentlyDeleteFiles = (fileIds: string[]) => {
    if (window.confirm(`Are you sure you want to permanently delete ${fileIds.length} item(s)? This action cannot be undone.`)) {
      fileIds.forEach(id => mockFsAdapter.permanentlyDeleteFile(id));
      refreshFiles();
    }
  }

  const restoreFiles = (fileIds: string[]) => {
    fileIds.forEach(id => mockFsAdapter.restoreFile(id));
    refreshFiles();
  }

  const renameFile = (fileId: string, newName: string) => {
    mockFsAdapter.renameFile(fileId, newName);
    refreshFiles();
  };

  const copyFiles = (fileIds: string[]) => {
    setClipboard({ fileIds, operation: 'copy' });
  };

  const cutFiles = (fileIds: string[]) => {
    setClipboard({ fileIds, operation: 'cut' });
  };

  const pasteFiles = () => {
    if (!clipboard || currentPath === 'Home' || currentPath === 'Trash' || currentPath.startsWith('virtual:')) return;

    clipboard.fileIds.forEach(id => {
        const fileToPaste = mockFsAdapter.getFile(id);
        if (fileToPaste) {
            // Prevent pasting a folder into itself
            if(fileToPaste.type === 'folder' && currentPath.startsWith(`${fileToPaste.path}${fileToPaste.name}/`)) {
                alert(`Cannot paste '${fileToPaste.name}' into a subfolder of itself.`);
                return;
            }

            let newName = fileToPaste.name;
            const existingNamesInCurrentPath = Object.values(mockFsAdapter.getAllFiles())
                .filter(f => f.path === currentPath && !f.isDeleted)
                .map(f => f.name);

            while (existingNamesInCurrentPath.includes(newName)) {
                newName = newName.includes('.')
                    ? newName.replace(/(\.[^.]+)$/, ' - Copy$1')
                    : `${newName} - Copy`;
            }

            mockFsAdapter.putFile({
                drive_key: currentPath.split(':')[0] as DriveKey,
                human_name: newName,
                path: currentPath,
                type: fileToPaste.type,
                content: fileToPaste.content,
                tags: [fileToPaste.type]
            });

            if (clipboard.operation === 'cut') {
                mockFsAdapter.deleteFile(id);
            }
        }
    });

    if (clipboard.operation === 'cut') {
        setClipboard(null);
    }

    refreshFiles();
  };

  const moveFiles = (fileIds: string[], destinationPath: string) => {
    mockFsAdapter.moveFiles(fileIds, destinationPath);
    refreshFiles();
  };

  const driveKey = currentPath.split(':')[0] as DriveKey;
  const currentDrive = DRIVES_CONFIG.find(d => d.key === driveKey) || null;
  const isVirtualView = currentPath.startsWith('virtual:');

  return {
    drives: DRIVES_CONFIG,
    files,
    currentPath,
    currentDrive,
    isVirtualView,
    allFiles, // expose for download/share logic
    navigateTo,
    navigateBack,
    navigateForward,
    navigateUp,
    canNavigateBack: historyIndex > 0,
    canNavigateForward: historyIndex < history.length - 1,
    createPlan,
    createFile,
    createFolder,
    uploadFiles,
    updateFileContent,
    deleteFiles,
    permanentlyDeleteFiles,
    restoreFiles,
    renameFile,
    copyFiles,
    cutFiles,
    pasteFiles,
    clipboard,
    isDocumentSearchOpen,
    closeDocumentSearch: () => setIsDocumentSearchOpen(false),
    searchDocuments,
    documentSearchTerm,
    moveFiles,
  };
};

// =================================================================================
// UI COMPONENTS
// =================================================================================

//--- Component: FileIcon ---
const FileIcon: React.FC<{ type: string, className?: string }> = ({ type, className = '' }) => {
    let iconClass = "fa-solid fa-file";
    let colorClass = "text-gray-500";
    switch(type) {
        case 'folder': iconClass = "fa-solid fa-folder"; colorClass = "text-yellow-500"; break;
        // Agent Lee Types
        case 'plan': iconClass = "fa-solid fa-clipboard-list"; colorClass = "text-blue-500"; break;
        case 'working': iconClass = "fa-solid fa-pen-to-square"; colorClass = "text-orange-500"; break;
        case 'ui': iconClass = "fa-solid fa-palette"; colorClass = "text-purple-500"; break;
        case 'system': iconClass = "fa-solid fa-gear"; colorClass = "text-gray-600"; break;
        case 'security': iconClass = "fa-solid fa-shield-halved"; colorClass = "text-red-500"; break;
        // Text & Code
        case 'text': case 'rtf': iconClass = "fa-solid fa-file-alt"; colorClass = "text-gray-500"; break;
        case 'md': case 'mdx': iconClass = "fa-brands fa-markdown"; colorClass = "text-gray-700"; break;
        case 'html': case 'htm': iconClass = "fa-brands fa-html5"; colorClass = "text-orange-600"; break;
        case 'css': case 'scss': iconClass = "fa-brands fa-css3-alt"; colorClass = "text-blue-500"; break;
        case 'js': case 'jsx': iconClass = "fa-brands fa-js-square"; colorClass = "text-yellow-500"; break;
        case 'ts': case 'tsx': iconClass = "fa-solid fa-file-code"; colorClass = "text-blue-600"; break;
        case 'json': iconClass = "fa-solid fa-brackets-curly"; colorClass = "text-purple-600"; break;
        case 'yaml': case 'yml': case 'toml': case 'ini': iconClass = "fa-solid fa-file-invoice"; colorClass = "text-gray-600"; break;
        case 'py': iconClass = "fa-brands fa-python"; colorClass = "text-blue-400"; break;
        case 'ps1': case 'bat': case 'sh': iconClass = "fa-solid fa-terminal"; colorClass = "text-gray-800"; break;
        // Office & Docs
        case 'docx': iconClass = "fa-solid fa-file-word"; colorClass = "text-blue-600"; break;
        case 'xlsx': iconClass = "fa-solid fa-file-excel"; colorClass = "text-green-600"; break;
        case 'pptx': iconClass = "fa-solid fa-file-powerpoint"; colorClass = "text-orange-600"; break;
        case 'pdf': iconClass = "fa-solid fa-file-pdf"; colorClass = "text-red-600"; break;
        case 'epub': case 'mobi': iconClass = "fa-solid fa-book-open"; colorClass = "text-amber-700"; break;
        // Media
        case 'zip': iconClass = "fa-solid fa-file-zipper"; colorClass = "text-yellow-600"; break;
        case 'mp3': case 'wav': case 'ogg': iconClass = "fa-solid fa-file-audio"; colorClass = "text-sky-500"; break;
        case 'mp4': case 'mov': case 'avi': case 'webm': iconClass = "fa-solid fa-file-video"; colorClass = "text-indigo-500"; break;
        case 'png': case 'jpg': case 'jpeg': case 'gif': case 'webp': iconClass = "fa-solid fa-file-image"; colorClass = "text-pink-500"; break;
        case 'svg': iconClass = "fa-solid fa-bezier-curve"; colorClass = "text-fuchsia-500"; break;
        // Structured Data
        case 'csv': iconClass = "fa-solid fa-file-csv"; colorClass = "text-green-700"; break;
        case 'xml': case 'rdf': case 'ttl': iconClass = "fa-solid fa-code"; colorClass = "text-indigo-700"; break;
        case 'sql': case 'db': case 'sqlite': iconClass = "fa-solid fa-database"; colorClass = "text-sky-700"; break;
    }
    return <i className={`${iconClass} ${colorClass} text-lg w-6 text-center ${className}`} aria-hidden="true"></i>;
};

//--- Component: StatusBar ---
const StatusBar: React.FC<{ itemCount: number; selectedCount: number; }> = ({ itemCount, selectedCount }) => {
  return (
    <div className="px-4 py-1 border-t border-gray-200 text-gray-600 flex justify-between text-xs flex-shrink-0" role="status" aria-live="polite">
      <span>{itemCount} items</span>
      {selectedCount > 0 && <span>{selectedCount} items selected</span>}
    </div>
  );
};

//--- Component: Notepad ---
const Notepad: React.FC<{
  file: FileItem;
  onClose: () => void;
  onSave: (data: { id?: string; name: string; content: string }) => void;
  isNew: boolean;
}> = ({ file, onClose, onSave, isNew }) => {
  const [content, setContent] = useState('');
  const [fileName, setFileName] = useState(file.name);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof file.content === 'string') {
      setContent(file.content);
    } else if (file.content !== null && file.content !== undefined) {
      setContent(JSON.stringify(file.content, null, 2));
    }

    if (isNew && nameInputRef.current) {
        nameInputRef.current.focus();
        nameInputRef.current.select();
    }
  }, [file, isNew]);

  const handleSave = () => {
    onSave({
      id: isNew ? undefined : file.id,
      name: fileName,
      content: content
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="notepad-title">
      <div className="bg-white rounded-lg shadow-2xl w-11/12 h-5/6 md:w-3/4 md:h-3/4 flex flex-col">
        <header className="p-2 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
          {isNew ? (
            <input
              ref={nameInputRef}
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="font-semibold text-gray-700 bg-transparent border-b-2 border-blue-400 focus:outline-none flex-1 px-2 py-1"
              aria-label="File name"
            />
          ) : (
            <h2 id="notepad-title" className="font-semibold text-gray-700">{file.name} - Notepad</h2>
          )}
          <button onClick={onClose} className="w-8 h-8 rounded hover:bg-red-500 hover:text-white transition-colors" aria-label="Close">&times;</button>
        </header>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="flex-1 p-4 font-mono text-sm resize-none outline-none"
          aria-label="File content"
        />
        <footer className="p-2 border-t flex justify-end bg-gray-50 rounded-b-lg">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 mr-2 transition-colors">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 transition-colors">Save</button>
        </footer>
      </div>
    </div>
  );
};

//--- Component: NewPlanModal ---
const NewPlanModal: React.FC<{ onClose: () => void; onCreate: (instruction: string) => Promise<void>; }> = ({ onClose, onCreate }) => {
  const [instruction, setInstruction] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instruction.trim() || isLoading) return;
    setIsLoading(true);
    try {
      await onCreate(instruction);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to create plan:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="new-plan-title">
      <div className="bg-white rounded-lg shadow-2xl w-11/12 max-w-lg flex flex-col">
        <header className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
          <h2 id="new-plan-title" className="text-lg font-semibold text-gray-700">Create a New To-Do Plan</h2>
          <button onClick={onClose} className="w-8 h-8 rounded hover:bg-gray-200 transition-colors" aria-label="Close">&times;</button>
        </header>
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <label htmlFor="instruction" className="block text-sm font-medium text-gray-700 mb-2">
              Instruction
            </label>
            <textarea
              id="instruction"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="e.g., Plan family grocery run under $120..."
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              rows={4}
              disabled={isLoading}
              aria-label="Plan instruction"
            />
          </div>
          <footer className="p-4 border-t flex justify-end bg-gray-50 rounded-b-lg">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 mr-2 transition-colors" disabled={isLoading}>
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 disabled:bg-blue-300 flex items-center transition-colors"
              disabled={!instruction.trim() || isLoading}
            >
              {isLoading && <i className="fa-solid fa-spinner fa-spin mr-2" aria-hidden="true"></i>}
              {isLoading ? 'Creating...' : 'Create Plan'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

//--- Component: DocumentSearchModal ---
const DocumentSearchModal: React.FC<{ onClose: () => void; onSearch: (term: string) => void; }> = ({ onClose, onSearch }) => {
    const [term, setTerm] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSearch(term);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="doc-search-title">
            <div className="bg-white rounded-lg shadow-2xl w-11/12 max-w-md flex flex-col">
                <header className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
                    <h2 id="doc-search-title" className="text-lg font-semibold text-gray-700">Search Documents</h2>
                    <button onClick={onClose} className="w-8 h-8 rounded hover:bg-gray-200 transition-colors" aria-label="Close">&times;</button>
                </header>
                <form onSubmit={handleSubmit}>
                    <div className="p-6">
                        <label htmlFor="doc-search" className="block text-sm font-medium text-gray-700 mb-2">
                            What type of document are you looking for?
                        </label>
                        <input
                            ref={inputRef}
                            id="doc-search"
                            type="text"
                            value={term}
                            onChange={(e) => setTerm(e.target.value)}
                            placeholder="e.g., 'report', 'notes', '.py', etc."
                            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            aria-label="Document search term"
                        />
                    </div>
                    <footer className="p-4 border-t flex justify-end bg-gray-50 rounded-b-lg">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 mr-2 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 transition-colors">
                            Search
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    );
};

//--- Component: ImagePreviewModal ---
const ImagePreviewModal: React.FC<{ file: FileItem; onClose: () => void; }> = ({ file, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="image-preview-title">
      <div className="bg-white rounded-lg shadow-2xl w-11/12 max-w-4xl h-5/6 flex flex-col" onClick={(e) => e.stopPropagation()}>
        <header className="p-2 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
          <h2 id="image-preview-title" className="font-semibold text-gray-700">{file.name}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded hover:bg-red-500 hover:text-white transition-colors" aria-label="Close">&times;</button>
        </header>
        <div className="flex-1 p-4 flex items-center justify-center bg-gray-100 overflow-hidden">
          <img 
            src={`https://picsum.photos/seed/${file.id}/1200/800`}
            alt={file.name}
            className="max-w-full max-h-full object-contain"
          />
        </div>
        <footer className="p-2 border-t text-xs text-gray-500 bg-gray-50 rounded-b-lg">
          <span className="truncate">{file.path}</span>
        </footer>
      </div>
    </div>
  );
};

const getFileTypeDescription = (type: string): string => {
      switch(type) {
          case 'folder': return 'File folder';
          case 'plan': return 'To-Do Plan';
          case 'working': return 'Working Document';
          case 'ui': return 'UI Artifact';
          case 'system': return 'System File';
          case 'security': return 'Security Log';
          case 'text': return 'Text Document';
          case 'md': return 'Markdown Document';
          case 'mdx': return 'MDX Document';
          case 'json': return 'JSON File';
          case 'yaml': return 'YAML Configuration';
          case 'py': return 'Python Script';
          case 'sh': return 'Shell Script';
          case 'docx': return 'Microsoft Word Document';
          case 'xlsx': return 'Microsoft Excel Worksheet';
          case 'pptx': return 'Microsoft PowerPoint Presentation';
          case 'pdf': return 'Portable Document Format';
          case 'epub': return 'EPUB E-Book';
          case 'csv': return 'CSV Data File';
          case 'sql': return 'SQL Script';
          case 'zip': return 'Compressed (zipped) Folder';
          case 'mp3': return 'MP3 audio file';
          case 'wav': return 'WAVE audio file';
          case 'mp4': return 'MP4 video file';
          case 'mov': return 'QuickTime video file';
          case 'jpg': return 'JPEG image';
          case 'png': return 'PNG image';
          case 'svg': return 'SVG Vector Graphic';
          default: return `${type.toUpperCase()} File`;
      }
};

const getCapabilitiesForType = (type: string): string[] => {
    switch(type) {
        // Text-Native Source & Code Files
        case 'text':
        case 'md':
        case 'mdx':
        case 'rtf': return ['Read', 'Summarize', 'Rewrite', 'Format', 'Sentiment Check'];
        case 'html':
        case 'htm':
        case 'tsx':
        case 'jsx':
        case 'js':
        case 'ts':
        case 'css':
        case 'scss': return ['Parse Logic', 'Explain Code', 'Auto-refactor', 'Add Documentation'];
        case 'json':
        case 'yaml':
        case 'yml':
        case 'toml':
        case 'ini': return ['Validate', 'Merge', 'Describe Schema', 'Generate from Prompt'];
        case 'py':
        case 'ps1':
        case 'bat':
        case 'sh': return ['Analyze Code', 'Plan Execution', 'Explain Script', 'Check Safety'];

        // Office-Style & Printable Docs
        case 'docx': return ['Create Proposal', 'Extract Text', 'Generate Summary', 'Format Contract'];
        case 'xlsx': return ['Summarize Data', 'Auto-graph', 'Generate CSV', 'Analyze Trends'];
        case 'pptx': return ['Draft Slides', 'Convert Summary to Deck', 'Generate Speaker Notes'];
        case 'pdf': return ['Extract Text & Tables', 'Annotate', 'Generate Forms', 'Rebuild to DOCX'];
        case 'epub':
        case 'mobi': return ['Read Metadata', 'Summarize Chapters', 'Re-export as PDF/HTML'];
        case 'csv': return ['Ingest Data', 'Index for Search', 'Generate Schema'];

        // Media & Creative Assets
        case 'png':
        case 'jpg':
        case 'jpeg':
        case 'gif':
        case 'webp': return ['Read Text (OCR)', 'Generate Caption', 'Aesthetic Score', 'Generate Variation'];
        case 'svg': return ['Describe Shape', 'Convert to PNG', 'Analyze Metadata'];
        case 'mp4':
        case 'mov':
        case 'avi':
        case 'webm': return ['Detect Scenes', 'Transcribe Video', 'Generate Summary', 'Extract Frames'];
        case 'mp3':
        case 'wav':
        case 'ogg': return ['Transcribe Audio', 'Summarize Speech', 'Sentiment Analysis', 'Generate Transcript'];
        
        // Structured / Machine Docs
        case 'xml':
        case 'rdf':
        case 'ttl': return ['Import Knowledge Graph', 'Parse Semantics', 'Validate Structure'];
        case 'sql':
        case 'db':
        case 'sqlite': return ['Plan Query', 'Explain Schema', 'Generate Sample Data'];

        // Agent Lee Types
        case 'plan': return ['Execute Plan', 'Check Status', 'Update Steps', 'Validate'];
        case 'working': return ['View Plan', 'Edit Steps', 'Mark Done'];

        default: return ['View Details', 'Manage File', 'Open'];
    }
};


//--- Component: PreviewPane ---
const PreviewPane: React.FC<{ file: FileItem | null, onCapabilityClick: (capability: string, file: FileItem) => void }> = ({ file, onCapabilityClick }) => {
    const imageTypes = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
    const videoTypes = ['mp4', 'mov', 'avi', 'webm'];

    if (!file) {
        return (
            <div className="hidden md:flex w-80 bg-white border-l border-gray-200 flex-col items-center justify-center text-gray-500 p-4" role="complementary" aria-label="File preview">
                <i className="fa-regular fa-file-image text-5xl mb-4" aria-hidden="true"></i>
                <p className="text-center">Select a file to see a preview</p>
            </div>
        );
    }

    return (
        <div className="hidden md:flex w-80 bg-white border-l border-gray-200 flex-col flex-shrink-0" role="complementary" aria-label="File preview">
            <div className="flex-shrink-0 p-4 border-b">
                {imageTypes.includes(file.type) && (
                    <img src={`https://picsum.photos/seed/${file.id}/400`} alt={file.name} className="w-full h-48 object-cover rounded-md bg-gray-100"/>
                )}
                {videoTypes.includes(file.type) && (
                     <video controls key={file.id} className="w-full h-48 rounded-md bg-black">
                        <source src="https://samplelib.com/lib/preview/mp4/sample-5s.mp4" type="video/mp4" />
                        Your browser does not support the video tag.
                    </video>
                )}
                {!imageTypes.includes(file.type) && !videoTypes.includes(file.type) && (
                    <div className="w-full h-48 flex items-center justify-center bg-gray-100 rounded-md text-6xl">
                        <FileIcon type={file.type} />
                    </div>
                )}
                <h3 className="font-semibold mt-4 truncate text-gray-800">{file.name}</h3>
                <p className="text-xs text-gray-500">{getFileTypeDescription(file.type)}</p>
            </div>
            <div className="flex-1 p-4 text-xs text-gray-600 space-y-4 overflow-y-auto">
                <div>
                    <h4 className="font-semibold text-sm text-gray-800 mb-2">Details</h4>
                    <div className="space-y-2">
                        <div>
                            <span className="font-medium text-gray-900 block">Date modified:</span>
                            <p>{new Date(file.modified).toLocaleString()}</p>
                        </div>
                        <div>
                            <span className="font-medium text-gray-900 block">Location:</span>
                            <p className="truncate">{file.path}</p>
                        </div>
                        <div>
                            <span className="font-medium text-gray-900 block">Type:</span>
                            <p>{getFileTypeDescription(file.type)}</p>
                        </div>
                    </div>
                </div>
                 <div>
                    <h4 className="font-semibold text-sm text-gray-800 mb-2">Agent Lee Capabilities</h4>
                    <div className="flex flex-wrap gap-1.5">
                        {getCapabilitiesForType(file.type).map(cap => (
                            <button key={cap} onClick={() => onCapabilityClick(cap, file)} className="px-2.5 py-1 bg-gray-200 text-gray-800 rounded-full text-xs font-medium cursor-pointer transition-colors hover:bg-blue-200 hover:text-blue-800">
                                {cap}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};


//--- Component: FileList ---
const FileList: React.FC<{ 
    files: FileItem[]; 
    selectedFileIds: Set<string>; 
    renamingFileId: string | null; 
    onFileOpen: (file: FileItem) => void; 
    onFileSelect: (file: FileItem, ctrlKey: boolean, shiftKey: boolean) => void; 
    onRenameSubmit: (fileId: string, newName: string) => void; 
    onMoveFiles: (fileIds: string[], destinationPath: string) => void;
}> = ({ files, selectedFileIds, renamingFileId, onFileOpen, onFileSelect, onRenameSubmit, onMoveFiles }) => {
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  
  const handleRename = (fileId: string, newName: string) => {
    if(newName.trim()) {
        onRenameSubmit(fileId, newName.trim());
    }
  };
  
  const handleDragStart = (e: React.DragEvent, file: FileItem) => {
    e.stopPropagation();
    const filesToDrag = selectedFileIds.has(file.id) ? Array.from(selectedFileIds) : [file.id];
    e.dataTransfer.setData('application/json', JSON.stringify(filesToDrag));
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleDropOnFolder = (e: React.DragEvent, folder: FileItem) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTargetId(null);
    try {
        const fileIds = JSON.parse(e.dataTransfer.getData('application/json'));
        if (Array.isArray(fileIds) && fileIds.length > 0) {
            const destinationPath = `${folder.path}${folder.name}/`.replace('//', '/');
            onMoveFiles(fileIds, destinationPath);
        }
    } catch (err) {
        console.error("Failed to handle drop:", err);
    }
  };
  
  const RenameInput: React.FC<{file: FileItem}> = ({file}) => (
      <input
        type="text"
        defaultValue={file.name}
        autoFocus
        onFocus={(e) => e.target.select()}
        onBlur={(e) => handleRename(file.id, e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleRename(file.id, e.currentTarget.value);
          if (e.key === 'Escape') onRenameSubmit(file.id, file.name); // Cancel
        }}
        className="ml-2 p-0 border border-blue-500 outline-none rounded-sm w-full"
        onClick={(e) => e.stopPropagation()} // Prevent row selection on click
        aria-label={`Rename ${file.name}`}
      />
  );

  return (
    <div className="flex-1 overflow-auto">
      {/* Desktop Table View */}
      <table className="w-full text-left hidden md:table">
        <thead className="sticky top-0 bg-white border-b border-gray-200 z-10">
          <tr>
            <th className="font-normal px-4 py-2 w-1/2">Name</th>
            <th className="font-normal px-4 py-2 w-1/4">Date modified</th>
            <th className="font-normal px-4 py-2 w-1/4">Type</th>
          </tr>
        </thead>
        <tbody>
          {files.map((file) => {
            const isRenaming = renamingFileId === file.id;
            const isFolder = file.type === 'folder';
            const isSelected = selectedFileIds.has(file.id);
            return (
              <tr
                key={file.id}
                draggable
                onDragStart={(e) => handleDragStart(e, file)}
                onDragOver={isFolder ? (e) => { e.preventDefault(); e.stopPropagation(); } : undefined}
                onDrop={isFolder ? (e) => handleDropOnFolder(e, file) : undefined}
                onClick={(e) => onFileSelect(file, e.ctrlKey, e.shiftKey)}
                onDoubleClick={() => (isRenaming ? undefined : onFileOpen(file))}
                className={`border-b border-gray-200 hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
              >
                <td className="px-4 py-2 align-middle">
                  <div className="flex items-center">
                    <FileIcon type={file.type} />
                    {isRenaming ? (
                      <RenameInput file={file} />
                    ) : (
                      <span className="ml-2 truncate font-medium">{file.name}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2 text-sm text-gray-600 align-middle">
                  {new Date(file.modified).toLocaleString()}
                </td>
                <td className="px-4 py-2 text-sm text-gray-600 align-middle">
                  {getFileTypeDescription(file.type)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Mobile List View */}
      <div className="md:hidden">
        {files.map(file => {
          const isRenaming = renamingFileId === file.id;
          const isDropTarget = dropTargetId === file.id;
          const isFolder = file.type === 'folder';
          return (
            <div
              key={file.id}
              draggable="true"
              onDragStart={(e) => handleDragStart(e, file)}
              onDragOver={isFolder ? (e) => {e.preventDefault(); e.stopPropagation();} : undefined}
              onDragEnter={isFolder ? (e) => {e.preventDefault(); e.stopPropagation(); setDropTargetId(file.id);} : undefined}
              onDragLeave={isFolder ? (e) => {e.preventDefault(); e.stopPropagation(); setDropTargetId(null);} : undefined}
              onDrop={isFolder ? (e) => handleDropOnFolder(e, file) : undefined}
              onClick={(e) => onFileSelect(file, e.ctrlKey, e.shiftKey)}
              onDoubleClick={() => isRenaming ? {} : onFileOpen(file)}
              className={`p-4 border-b border-gray-200 ${isDropTarget ? 'outline outline-2 outline-blue-500' : ''} ${selectedFileIds.has(file.id) ? 'bg-blue-100' : 'active:bg-gray-100'}`}
            >
              <div className="flex items-center mb-2">
                <FileIcon type={file.type} />
                {isRenaming ? <RenameInput file={file} /> : <span className="ml-2 truncate font-medium">{file.name}</span>}
              </div>
              <div className="text-sm text-gray-600 ml-8">
                <div>{new Date(file.modified).toLocaleString()}</div>
                <div>{getFileTypeDescription(file.type)}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
};

//--- Component: Header ---
const Header: React.FC<{
  currentPath: string;
  currentDrive: Drive | null;
  canNavigateBack: boolean;
  canNavigateForward: boolean;
  onNavigateBack: () => void;
  onNavigateForward: () => void;
  onNavigateUp: () => void;
  onRefresh: () => void;
  onSearch: () => void;
}> = ({ currentPath, currentDrive, canNavigateBack, canNavigateForward, onNavigateBack, onNavigateForward, onNavigateUp, onRefresh, onSearch }) => {
  return (
    <header className="flex items-center px-4 py-2 border-b border-gray-200 bg-white flex-shrink-0" role="banner">
      <div className="flex items-center space-x-1 mr-4">
        <button
          onClick={onNavigateBack}
          disabled={!canNavigateBack}
          className="p-2 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Back"
          title="Back"
        >
          <i className="fa-solid fa-arrow-left" aria-hidden="true"></i>
        </button>
        <button
          onClick={onNavigateForward}
          disabled={!canNavigateForward}
          className="p-2 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Forward"
          title="Forward"
        >
          <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
        </button>
        <button
          onClick={onNavigateUp}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          aria-label="Up"
          title="Up"
        >
          <i className="fa-solid fa-arrow-up" aria-hidden="true"></i>
        </button>
        <button
          onClick={onRefresh}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          aria-label="Refresh"
          title="Refresh"
        >
          <i className="fa-solid fa-rotate-right" aria-hidden="true"></i>
        </button>
      </div>
      <div className="flex-1 flex items-center bg-gray-100 rounded px-3 py-1.5 text-sm" role="navigation" aria-label="Breadcrumb">
        {currentDrive && <span className="mr-2">{currentDrive.icon}</span>}
        <span className="truncate">{currentPath}</span>
      </div>
      <button
        onClick={onSearch}
        className="ml-4 p-2 rounded hover:bg-gray-200 transition-colors"
        aria-label="Search"
        title="Search"
      >
        <i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
      </button>
    </header>
  );
};

//--- Component: Sidebar ---
const Sidebar: React.FC<{
  drives: Drive[];
  currentPath: string;
  onNavigate: (path: string) => void;
}> = ({ drives, currentPath, onNavigate }) => {
  const quickAccessItems = [
    { label: 'Home', path: 'Home', icon: <i className="fa-solid fa-house" /> },
    { label: 'Music', path: 'virtual:music', icon: <i className="fa-solid fa-music" /> },
    { label: 'Pictures', path: 'virtual:pictures', icon: <i className="fa-solid fa-image" /> },
    { label: 'Videos', path: 'virtual:videos', icon: <i className="fa-solid fa-video" /> },
    { label: 'Downloads', path: 'virtual:downloads', icon: <i className="fa-solid fa-download" /> },
    { label: 'Documents', path: 'virtual:documents', icon: <i className="fa-solid fa-file-alt" /> },
    { label: 'Trash', path: 'Trash', icon: <i className="fa-solid fa-trash" /> },
  ];

  return (
    <aside className="w-56 bg-gray-50 border-r border-gray-200 flex-shrink-0 overflow-y-auto" role="navigation" aria-label="Sidebar">
      <nav className="p-2">
        <div className="mb-4">
          <h3 className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Quick Access</h3>
          <ul>
            {quickAccessItems.map(item => (
              <li key={item.path}>
                <button
                  onClick={() => onNavigate(item.path)}
                  className={`w-full flex items-center px-3 py-2 rounded text-sm transition-colors ${
                    currentPath === item.path ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200 text-gray-700'
                  }`}
                  aria-current={currentPath === item.path ? 'page' : undefined}
                >
                  <span className="mr-3 w-5 text-center">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">LEONARD Drives</h3>
          <ul>
            {drives.map(drive => (
              <li key={drive.key}>
                <button
                  onClick={() => onNavigate(`${drive.key}:/`)}
                  className={`w-full flex items-center px-3 py-2 rounded text-sm transition-colors ${
                    currentPath.startsWith(`${drive.key}:/`) ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200 text-gray-700'
                  }`}
                  aria-current={currentPath.startsWith(`${drive.key}:/`) ? 'page' : undefined}
                >
                  <span className="mr-3 w-5 text-center">{drive.icon}</span>
                  <span>{drive.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </aside>
  );
};

//--- Component: AIResultModal ---
const AIResultModal: React.FC<{ result: string; onClose: () => void; }> = ({ result, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="ai-result-title">
      <div className="bg-white rounded-lg shadow-2xl w-11/12 max-w-3xl h-3/4 flex flex-col">
        <header className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
          <h2 id="ai-result-title" className="text-lg font-semibold text-gray-700">Agent Lee Analysis</h2>
          <button onClick={onClose} className="w-8 h-8 rounded hover:bg-gray-200 transition-colors" aria-label="Close">&times;</button>
        </header>
        <div className="flex-1 p-6 overflow-y-auto">
          <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">{result}</pre>
        </div>
        <footer className="p-4 border-t flex justify-end bg-gray-50 rounded-b-lg">
          <button onClick={onClose} className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 transition-colors">
            Close
          </button>
        </footer>
      </div>
    </div>
  );
};

//--- Component: AgentLeePanel ---
const AgentLeePanel: React.FC<{
  onNewPlan: () => void;
  onNewFile: () => void;
  onNewFolder: () => void;
  onUpload: () => void;
}> = ({ onNewPlan, onNewFile, onNewFolder, onUpload }) => {
  return (
    <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200">
      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
        <i className="fa-solid fa-robot mr-2 text-blue-600" aria-hidden="true"></i>
        Agent Lee Actions
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <button
          onClick={onNewPlan}
          className="flex flex-col items-center justify-center p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200"
          aria-label="Create new plan"
        >
          <i className="fa-solid fa-clipboard-list text-2xl text-blue-500 mb-1" aria-hidden="true"></i>
          <span className="text-xs font-medium text-gray-700">New Plan</span>
        </button>
        <button
          onClick={onNewFile}
          className="flex flex-col items-center justify-center p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200"
          aria-label="Create new file"
        >
          <i className="fa-solid fa-file-plus text-2xl text-green-500 mb-1" aria-hidden="true"></i>
          <span className="text-xs font-medium text-gray-700">New File</span>
        </button>
        <button
          onClick={onNewFolder}
          className="flex flex-col items-center justify-center p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200"
          aria-label="Create new folder"
        >
          <i className="fa-solid fa-folder-plus text-2xl text-yellow-500 mb-1" aria-hidden="true"></i>
          <span className="text-xs font-medium text-gray-700">New Folder</span>
        </button>
        <button
          onClick={onUpload}
          className="flex flex-col items-center justify-center p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200"
          aria-label="Upload files"
        >
          <i className="fa-solid fa-upload text-2xl text-purple-500 mb-1" aria-hidden="true"></i>
          <span className="text-xs font-medium text-gray-700">Upload</span>
        </button>
      </div>
    </div>
  );
};

//--- Main Component: AgentNotepad ---
const AgentNotepad: React.FC = () => {
  const fileExplorer = useFileExplorer();
  const localAnalyzer = useLocalAnalyzer();
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [notepadFile, setNotepadFile] = useState<FileItem | null>(null);
  const [isNotepadNew, setIsNotepadNew] = useState(false);
  const [imagePreviewFile, setImagePreviewFile] = useState<FileItem | null>(null);
  const [isNewPlanModalOpen, setIsNewPlanModalOpen] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: FileItem, ctrlKey: boolean, shiftKey: boolean) => {
    const fileIndex = fileExplorer.files.findIndex(f => f.id === file.id);

    if (shiftKey && lastSelectedIndex !== null) {
      const start = Math.min(lastSelectedIndex, fileIndex);
      const end = Math.max(lastSelectedIndex, fileIndex);
      const newSelection = new Set(selectedFileIds);
      for (let i = start; i <= end; i++) {
        newSelection.add(fileExplorer.files[i].id);
      }
      setSelectedFileIds(newSelection);
    } else if (ctrlKey) {
      const newSelection = new Set(selectedFileIds);
      if (newSelection.has(file.id)) {
        newSelection.delete(file.id);
      } else {
        newSelection.add(file.id);
      }
      setSelectedFileIds(newSelection);
      setLastSelectedIndex(fileIndex);
    } else {
      setSelectedFileIds(new Set([file.id]));
      setLastSelectedIndex(fileIndex);
    }
  };

  const handleFileOpen = (file: FileItem) => {
    if (file.type === 'folder') {
      const newPath = `${file.path}${file.name}/`.replace('//', '/');
      fileExplorer.navigateTo(newPath);
    } else if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(file.type)) {
      setImagePreviewFile(file);
    } else {
      setNotepadFile(file);
      setIsNotepadNew(false);
    }
  };

  const handleNotepadSave = (data: { id?: string; name: string; content: string }) => {
    if (data.id) {
      fileExplorer.updateFileContent(data.id, data.content);
    } else {
      fileExplorer.createFile({
        name: data.name,
        type: 'text',
        content: data.content,
        path: fileExplorer.currentPath
      });
    }
  };

  const handleNewFile = () => {
    if (fileExplorer.currentPath === 'Home' || fileExplorer.currentPath === 'Trash' || fileExplorer.isVirtualView) {
      alert("Please select a drive or folder first.");
      return;
    }
    setNotepadFile({
      id: '',
      name: 'Untitled.txt',
      type: 'text',
      modified: new Date().toISOString(),
      location: fileExplorer.currentPath,
      path: fileExplorer.currentPath,
      content: ''
    });
    setIsNotepadNew(true);
  };

  const handleNewFolder = () => {
    const folderName = prompt("Enter folder name:");
    if (folderName) {
      fileExplorer.createFolder(folderName);
    }
  };

  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const filesToUpload: { name: string, type: string, content: string | ArrayBuffer | null }[] = [];
    let filesProcessed = 0;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const extension = file.name.split('.').pop()?.toLowerCase() || 'txt';
        filesToUpload.push({
          name: file.name,
          type: extension,
          content: event.target?.result || null
        });
        filesProcessed++;
        if (filesProcessed === files.length) {
          fileExplorer.uploadFiles(filesToUpload);
        }
      };
      reader.readAsText(file);
    });

    e.target.value = '';
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'a') {
        e.preventDefault();
        setSelectedFileIds(new Set(fileExplorer.files.map(f => f.id)));
      } else if (e.key === 'c' && selectedFileIds.size > 0) {
        e.preventDefault();
        fileExplorer.copyFiles(Array.from(selectedFileIds));
      } else if (e.key === 'x' && selectedFileIds.size > 0) {
        e.preventDefault();
        fileExplorer.cutFiles(Array.from(selectedFileIds));
      } else if (e.key === 'v') {
        e.preventDefault();
        fileExplorer.pasteFiles();
      }
    } else if (e.key === 'Delete' && selectedFileIds.size > 0) {
      e.preventDefault();
      if (fileExplorer.currentPath === 'Trash') {
        fileExplorer.permanentlyDeleteFiles(Array.from(selectedFileIds));
      } else {
        fileExplorer.deleteFiles(Array.from(selectedFileIds));
      }
      setSelectedFileIds(new Set());
    } else if (e.key === 'F2' && selectedFileIds.size === 1) {
      e.preventDefault();
      setRenamingFileId(Array.from(selectedFileIds)[0]);
    } else if (e.key === 'Escape') {
      setSelectedFileIds(new Set());
      setRenamingFileId(null);
    }
  }, [selectedFileIds, fileExplorer]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleCapabilityClick = async (capability: string, file: FileItem) => {
    setAiResult('Analyzing... Please wait.');
    try {
      const result = await localAnalyzer.analyzeContent(capability, file);
      setAiResult(result ?? "");
    } catch (error) {
      setAiResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleRenameSubmit = (fileId: string, newName: string) => {
    fileExplorer.renameFile(fileId, newName);
    setRenamingFileId(null);
  };

  const handleCreatePlan = async (instruction: string) => {
    await fileExplorer.createPlan(instruction);
    setIsNewPlanModalOpen(false);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100 font-sans">
      <Header
        currentPath={fileExplorer.currentPath}
        currentDrive={fileExplorer.currentDrive}
        canNavigateBack={fileExplorer.canNavigateBack}
        canNavigateForward={fileExplorer.canNavigateForward}
        onNavigateBack={fileExplorer.navigateBack}
        onNavigateForward={fileExplorer.navigateForward}
        onNavigateUp={fileExplorer.navigateUp}
        onRefresh={() => window.location.reload()}
        onSearch={() => fileExplorer.navigateTo('virtual:documents')}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          drives={fileExplorer.drives}
          currentPath={fileExplorer.currentPath}
          onNavigate={fileExplorer.navigateTo}
        />
        <main className="flex-1 flex flex-col overflow-hidden bg-white" role="main">
          <AgentLeePanel
            onNewPlan={() => setIsNewPlanModalOpen(true)}
            onNewFile={handleNewFile}
            onNewFolder={handleNewFolder}
            onUpload={handleUpload}
          />
          <FileList
            files={fileExplorer.files}
            selectedFileIds={selectedFileIds}
            renamingFileId={renamingFileId}
            onFileOpen={handleFileOpen}
            onFileSelect={handleFileSelect}
            onRenameSubmit={handleRenameSubmit}
            onMoveFiles={fileExplorer.moveFiles}
          />
          <StatusBar itemCount={fileExplorer.files.length} selectedCount={selectedFileIds.size} />
        </main>
        <PreviewPane
          file={selectedFileIds.size === 1 ? fileExplorer.files.find(f => f.id === Array.from(selectedFileIds)[0]) || null : null}
          onCapabilityClick={handleCapabilityClick}
        />
      </div>

      {/* Modals */}
      {notepadFile && (
        <Notepad
          file={notepadFile}
          onClose={() => setNotepadFile(null)}
          onSave={handleNotepadSave}
          isNew={isNotepadNew}
        />
      )}
      {imagePreviewFile && (
        <ImagePreviewModal
          file={imagePreviewFile}
          onClose={() => setImagePreviewFile(null)}
        />
      )}
      {isNewPlanModalOpen && (
        <NewPlanModal
          onClose={() => setIsNewPlanModalOpen(false)}
          onCreate={handleCreatePlan}
        />
      )}
      {fileExplorer.isDocumentSearchOpen && (
        <DocumentSearchModal
          onClose={fileExplorer.closeDocumentSearch}
          onSearch={fileExplorer.searchDocuments}
        />
      )}
      {aiResult && (
        <AIResultModal
          result={aiResult}
          onClose={() => setAiResult(null)}
        />
      )}

      {/* Hidden file input for uploads */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
        aria-label="File upload input"
      />

      {/* Persona Health diagnostics overlay (bottom-right, dev-visible) */}
      <div
        style={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 9000,
          pointerEvents: 'auto',
        }}
      >
        <PersonaHealthPanel pollIntervalMs={4000} />
      </div>
    </div>
  );
};

//--- Export with Error Boundary ---
export default function AgentNotepadWithErrorBoundary() {
  return (
    <AgentNotepadErrorBoundary>
      <AgentNotepad />
    </AgentNotepadErrorBoundary>
  );
}
