<!--
DOC_CLASS: GOVERNANCE
DOC_ID: governance.zone-model
OWNER: Lee Prime
LAST_UPDATED: 2026-04-03
-->

# Zone Governance Model

## Overview

Agent Lee operates within a three-zone permission model enforced by Shield Aegis and the GovernanceContract.

## Zones

### Z0 — AgentVM (Sandbox)
- Scope: All in-browser execution (React runtime, IndexedDB, EventBus, SLMRouter, local Ollama models)
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
- Default access: high automation, tiered approval required only for write-heavy ops
- Who can write: any core agent with DEFAULT_CAPS
- Examples: generating code in AgentLeeVM, reading MemoryDB, emitting EventBus events

### Z1 — Host Files (Device Filesystem)
- Scope: `/storage/emulated/0/AgentLee/**`, `/storage/emulated/0/Download/**`
- Default access: **OFF** — explicit Shield approval required for every write
- Who can write: only MCP agents via Portal order from Lee Prime
- Z1 allowlist (reportable paths, auto-allow append):
  - `/storage/emulated/0/AgentLee/system_reports/**`
- Examples: writing NDJSON report files, rotating logs, writing daily SITREPs

### Z2 — Memory / DB (Memory Lake + DB connectors)
- Scope: MemoryDB (IndexedDB), Firebase, any external DB
- Default access: READ + APPEND allowed; MUTATE/DELETE require explicit approval
- Who can write: Clerk Archive and Janitor Sentinel (scoped), Lee Prime orders
- Examples: Memory Lake saves, checkpoint writes, manifest.json updates

## Capability Strings

| Capability | Zone | Default |
|---|---|---|
| Z0_READ | Z0 | ✅ always |
| Z0_WRITE_FILES | Z0 | ✅ always |
| Z0_RUN_TOOLS | Z0 | ✅ always |
| Z0_RUN_WORKFLOWS | Z0 | ✅ always |
| Z1_READ_FILES | Z1 | scoped grant |
| Z1_WRITE_FILES | Z1 | **explicit approval required** |
| Z1_RUN_COMMANDS | Z1 | **explicit approval required** |
| Z2_READ_MEMORY | Z2 | ✅ always |
| Z2_WRITE_MEMORY_APPEND | Z2 | ✅ always |
| Z2_WRITE_MEMORY_MUTATE | Z2 | **explicit approval required** |
| Z2_WRITE_MEMORY_DELETE | Z2 | **explicit approval required** |
| Z2_DB_READ | Z2 | ✅ always |
| Z2_DB_WRITE | Z2 | **explicit approval required** |

## Portal Protocol

No core agent crosses zones without a **Portal step**:
1. Core agent submits PORTAL REQUEST to Lee Prime
2. Shield Aegis reviews capability requirements against current grants
3. If approved: Write Intent Block created with before/after checkpoints
4. MCP agent executes the actual Z1/Z2 write
5. Clerk Archive logs the event to `system_reports/system/governance/permissions.ndjson`

## Security Notes

- `serviceAccountKey.json` and `*adminsdk*.json` must **never** appear in reports
- `.env*` values are auto-redacted by Shield before any report is written
- Break-glass: time-limited, scoped, fully audited — does NOT remove approval for critical ops

