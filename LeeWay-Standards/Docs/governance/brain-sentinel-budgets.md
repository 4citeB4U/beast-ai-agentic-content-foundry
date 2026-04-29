<!--
DOC_CLASS: GOVERNANCE
DOC_ID: governance.brain-sentinel-budgets
OWNER: Brain Sentinel
LAST_UPDATED: 2026-04-03
-->

# Brain Sentinel — Runtime Budgets

## Purpose

Brain Sentinel enforces the "many tasks queued, few executing" law on a resource-constrained edge device.

## Budget Modes

| Mode | Max Active Agents | Heavy Lane | Write Policy | Scheduler Tick |
|---|---|---|---|---|
| FULL | 4 | 1 (yes) | normal | 1500ms |
| BALANCED | 3 | 1 (yes) | normal | 2000ms |
| BATTERY | 2 | 0 (no) | throttled | 4000ms |
| SLEEP_CITY | 1 | 0 (no) | freeze | 10000ms |
| SAFE | 2 | 0 (no) | freeze | 5000ms |

**Default mode:** BALANCED

## Lane Types

| Lane | Type | Concurrency |
|---|---|---|
| A | Light (routing, summaries, logs) | up to budget |
| B | Heavy (deep reasoning, local Ollama model calls) | max 1 at a time |
## LeeWay-Compliant Local Model Workflow (2026)

**All inference is performed locally using Ollama models. No leeway fallback is used except for explicit automation.**

**Registered execution-layer models:**
- **gemma4:e2b** — Reasoning, general LLM tasks
- **qwen2.5vl:3b** — Vision, multimodal/image tasks
- **qwen2.5-coder:1.5b** — Code and database tasks

**How it works:**
- All model requests are routed through the SLMRouter and VisionAgent.
- Only the above models are registered as execution-layer tools.
- No direct model-to-UI wiring; all model use is agent-orchestrated.
- leeway and other cloud APIs are disabled for inference except for explicit automation or fallback by user override.

**Configuration:** See `.env.local` for model endpoints and selection. All models are stored in `E:\ollama-models`.
| C | Write / Portal (deterministic, serialized) | max 1, serialized with checkpoints |

## Mode Change Rules

- FULL mode: only allowed when device is charging
- BATTERY mode: auto-triggered if battery < 30% (or user override)
- SAFE mode: triggered by Shield on threat detection, or by user `/lee.safe_mode on`
- SLEEP_CITY: triggered in off-peak / background

## Log Storm Detection

Brain Sentinel watches for abnormal reporting volume:
- If any agent generates > 500 report events / minute → recommend throttle
- Log storm event → `system_reports/system/runtime/brain_sentinel.ndjson`
- Brain Sentinel may recommend Shield freeze non-essential reporting

## Commands

- `/lee.safe_mode on|off` — toggle SAFE mode
- `/lee.status` — show current mode and budget
- `/lee.boundaries` — show max agents, forbidden actions, approval gates

## Reporting

All budget changes are written to:
- `system_reports/system/runtime/brain_sentinel.ndjson` (SYSTEM class)
- EventBus `brain:budget_changed` event

