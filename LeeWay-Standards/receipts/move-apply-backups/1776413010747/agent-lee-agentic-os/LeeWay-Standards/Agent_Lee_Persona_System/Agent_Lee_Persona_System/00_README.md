# Agent Lee Persona System Directory

This folder is the structured persona system for Agent Lee OS.

## Directory layout
- `01_SUPERIOR_PROMPT/Agent_Lee_Superior_Prompt.md`
  - Unified system prompt
- `02_ENGINE/agentlee_persona_engine_v1_1.js`
  - Main persona engine with regional voice skins and poetic overlay
- `03_POETRY/agentlee_poetry_bank.js`
  - Poetry template bank
- `04_LINGO/agentlee_lingo_worker.js`
  - Dynamic slang/lingo research worker with Memory Lake write + mirror flow
- `05_MANIFEST/agentlee_persona_manifest.json`
  - Implementation manifest for integration
- `99_PASTE_PACK/Agent_Lee_All_In_One_Paste_Pack.md`
  - All core files merged into one copy/paste document

## Integration order
1. Load poetry bank
2. Load persona engine
3. Load lingo worker
4. Load superior prompt into your orchestration layer / system prompt slot

## Canonical defaults
- poetryLevel: 2
- overlayDefault: POETIC_MICRO
- Vision overlay on planning/creative contexts
- Regional modes:
  - NYC_BOAST
  - CHI_SWAG
  - SOUTH_DRAWL
- Schema-first cognition always overrides style

## Notes
- This directory keeps the updated engine as `agentlee_persona_engine_v1_1.js`
- Use the paste pack if your device or app blocks separate downloads
