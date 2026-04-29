<!--
DOC_CLASS: ARCHITECTURE
DOC_ID: architecture.master-plan
OWNER: Leonard J Lee / Leeway Industries
LAST_UPDATED: 2026-04-04
-->

# Agent Lee Agentic Operating System — Master Plan (Current State)
> Engine: leeway leeway + local llama.cpp | Auth: leeway OAuth only | No raw API keys on frontend ever

## Security Foundation
User leeway Login → Firebase idToken → Cloud Function → leeway API (server-side key)

## Agent And Operative Model

Agents are command intelligence. Operatives are endpoint-bound execution workers.

- Agent: plans, routes, governs, and approves.
- Operative: executes on one active endpoint through approved channels.

Hard invariant:

> One operative, one endpoint, one live assignment context.

Endpoint classes:

- Mobile operatives
- Desktop operatives
- Communications operatives

Canonical specification: `docs/architecture/operative-model.md`.

## The 20-Agent System (9 Families)

### Core Team (9 agents — `agents/` directory)
| Agent | Family | Role |
|---|---|---|
| **AgentLee** | LEE | Sovereign Orchestrator — routes all G1-G8 workflows |
| **Atlas** | VECTOR | Lead Researcher — web/GitHub/MCP search |
| **Nova** | FORGE | Lead Engineer — code + VM execution |
| **Echo** | AURA | Voice + Emotion — sentiment detection |
| **Sage** | ARCHIVE | Memory + Dream compression |
| **Shield** | AEGIS | Security + Zone enforcement + self-healing |
| **Pixel** | AURA | Visual Intelligence + design |
| **Nexus** | NEXUS | Deployment Lead |
| **Aria** | AURA | Social + Translation |

### Governance Corps (5 agents — `agents/` directory)
| Agent | Family | Role |
|---|---|---|
| **ClerkArchive** | ARCHIVE | NDJSON schema + report indexing |
| **JanitorSentinel** | SENTINEL | Log rotation + compaction |
| **LibrarianAegis** | AEGIS | Docs taxonomy enforcement |
| **MarshalVerify** | AEGIS | G8 Governance lead + verification |
| **LeewayStandardsAgent** | AEGIS | Header/tag/secret policy enforcement |

### Voice Pipeline (6 agents — `agents/` directory)
| Agent | Family | Role |
|---|---|---|
| **LiveConductorAgent** | NEXUS | Voice session orchestrator |
| **StreamingSTTAgent** | AURA | Speech-to-text EventBus adapter |
| **StreamingTTSAgent** | AURA | Text-to-speech EventBus adapter |
| **VisionAgent** | VECTOR | Screen capture + scene analysis |
| **RouterAgent** | SENTINEL | Intent routing + load balancing |
| **SafetyRedactionAgent** | AEGIS | PII + injection redaction |

### Supporting Cast (WorldRegistry only — no standalone files)
Lily/Gabriel/Adam Cortex, Syntax/Patch/BugHunter Forge, Scribe Archive, Guard Aegis, Search Vector, Brain Sentinel, Health Sentinel

## Workflow Map (G1–G8 + Voice)

| ID | Name | Lead Agent | Key Helpers |
|---|---|---|---|
| G1 | Conversation | AgentLee | Aria |
| G2 | Research | Atlas | Sage, Search |
| G3 | Engineering | Nova | BugHunter, Patch, Syntax |
| G4 | Design + Creative | Pixel | Aria, Echo |
| G5 | Memory + Dream | Sage | Scribe |
| G6 | Deployment | Nexus | Shield |
| G7 | Health + Budget | Brain Sentinel | Health, Janitor |
| G8 | Governance | MarshalVerify | Clerk, Janitor, Librarian, Standards |
| Voice | Realtime Voice | LiveConductorAgent | STT, TTS, Router, Safety, Vision |

## Architecture Phases (Completed)
1. Auth + leeway Foundation ✔
2. Core Agent Team (9 agents) ✔
3. Agent VM Popup (`AgentLeeVM.tsx`) ✔
4. Voice/Emotion/Social ✔
5. Dream + Memory ✔
6. Self-Healing + Governance Corps ✔
7. PWA + GitHub Pages Deploy ✔
8. **Local Voice Pipeline** (6 new agents, FastAPI server) ✔

## In Scope Next
- Extended MCP portal network
- Multi-device memory sync (Firebase Firestore)
- Production deploy with custom domain

