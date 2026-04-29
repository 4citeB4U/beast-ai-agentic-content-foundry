# Repo Ownership Matrix

Policy statement: no layer executes independently. All execution flow is Standards -> Integrated -> Runtime.

Core sovereignty statement: the LeeWay Product Line has exactly two sovereign core layers: LeeWay-Standards (law, trust, agent birth) and LeeWay-Edge-Integrated (motherboard, orchestration, render embodiment).

Core law: all system agents are born from LeeWay-Standards. All user-visible experience is rendered through LeeWay-Edge-Integrated.

Mandatory projection rule: Projection repos may consume core layers, but may not privately re-own them.

Echo doctrine: files with familiar names may exist in projection repos for placement and tracing, but those files must be echo/adapters that resolve to core-owned source-of-truth and may not become sovereign implementations.

## Source-Of-Truth Matrix

| repo | path / pattern | owner layer | responsibility | allowed imports from | forbidden imports from | allowed execution role | move target if misplaced | quarantine if unresolved | delete / externalize class |
|---|---|---|---|---|---|---|---|---|---|
| LeeWay-Standards | src/contracts/** | standards | shared contracts and canonical types | none | integrated, runtime, projection repos | validate and define law | LeeWay-Standards/src/contracts | yes | none |
| LeeWay-Standards | src/validators/** | standards | validators and policy checks | src/contracts | integrated, runtime, projection repos | validate only | LeeWay-Standards/src/validators | yes | none |
| LeeWay-Standards | src/core/tag-validator* | standards | compliance and tag integrity | src/contracts | integrated, runtime, projection repos | validate only | LeeWay-Standards/src/core | yes | none |
| LeeWay-Standards | src/runtime/** | standards | runtime law and guardrails | src/contracts, src/validators | integrated UI, runtime internals | gate and authorize | LeeWay-Standards/src/runtime | yes | none |
| LeeWay-Standards | **/node_modules/** | external | dependency cache | n/a | n/a | none | n/a | yes | delete |
| LeeWay-Standards | **/.venv/** | external | local environment cache | n/a | n/a | none | n/a | yes | delete |
| LeeWay-Edge-Integrated | app/motherboard/** | integrated | motherboard and control shell | standards/contracts | runtime internals, projection internals | orchestrate | LeeWay-Edge-Integrated/app/motherboard | yes | none |
| LeeWay-Edge-Integrated | app/rooms/** | integrated | room/session shell and UX | standards/contracts, adapters | rtc transport internals, gpu dispatch internals | orchestrate | LeeWay-Edge-Integrated/app/rooms | yes | none |
| LeeWay-Edge-Integrated | services/** | integrated | orchestration services, issuance and session control | standards/contracts, adapters | runtime internals, projection internals | orchestrate | LeeWay-Edge-Integrated/services | yes | none |
| LeeWay-Edge-Integrated | adapters/rtc.* | integrated | runtime bridge to rtc | standards/contracts | projection repos | orchestrate only via adapter | LeeWay-Edge-Integrated/adapters | yes | none |
| LeeWay-Edge-Integrated | adapters/gpu.* | integrated | runtime bridge to gpu | standards/contracts | projection repos | orchestrate only via adapter | LeeWay-Edge-Integrated/adapters | yes | none |
| LeeWay-Edge-RTC-main | src/transport/** | runtime-rtc | signaling and media transport | standards/contracts | integrated/ui, projection repos, gpu internals | execute runtime communication | LeeWay-Edge-RTC-main/src/transport | yes | none |
| LeeWay-Edge-RTC-main | src/room/** | runtime-rtc | room communication state and lifecycle | standards/contracts | integrated/ui, projection repos, gpu internals | execute runtime communication | LeeWay-Edge-RTC-main/src/room | yes | none |
| LeeWay-Edge-RTC-main | src/diagnostics/** | runtime-rtc | rtc diagnostics emission and health | standards/contracts | integrated/ui, projection repos | execute runtime communication | LeeWay-Edge-RTC-main/src/diagnostics | yes | none |
| LeewayEdgeWebGPU | gpu/bootstrap/** | runtime-gpu | compute bootstrap and device bring-up | standards/contracts | integrated/ui, projection repos, rtc internals | execute runtime compute | LeewayEdgeWebGPU/gpu/bootstrap | yes | none |
| LeewayEdgeWebGPU | gpu/pipeline/** | runtime-gpu | compute pipeline orchestration | standards/contracts | integrated/ui, projection repos, rtc internals | execute runtime compute | LeewayEdgeWebGPU/gpu/pipeline | yes | none |
| LeewayEdgeWebGPU | gpu/workers/** | runtime-gpu | worker manager and execution workers | standards/contracts | integrated/ui, projection repos, rtc internals | execute runtime compute | LeewayEdgeWebGPU/gpu/workers | yes | none |
| LeewayEdgeWebGPU | gpu/fallback/** | runtime-gpu | fallback engine for compute | standards/contracts | integrated/ui, projection repos, rtc internals | execute runtime compute | LeewayEdgeWebGPU/gpu/fallback | yes | none |
| agent-lee-agentic-os | pages/** | projection | app projection pages and UX | integrated clients, standards/contracts | rtc internals, gpu internals, standards/runtime law internals | projection only | LeeWay-Edge-Integrated/app or agent-lee-agentic-os/apps/agent-lee/ui | yes | none |
| agent-lee-agentic-os | components/** | projection | projection components and studio UX | integrated clients, standards/contracts | rtc internals, gpu internals, standards/runtime law internals | projection only | agent-lee-agentic-os/apps/agent-lee/ui | yes | none |
| agent-lee-agentic-os | core/LeewayRTCClient.ts | projection | should be adapter consumption, not runtime ownership | integrated adapters | LeeWay-Edge-RTC-main/src/** | projection only | LeeWay-Edge-Integrated/adapters | yes | none |
| agent-lee-agentic-os | core/RTCInitializer.ts | projection | should be adapter consumption, not runtime ownership | integrated adapters | LeeWay-Edge-RTC-main/src/** | projection only | LeeWay-Edge-Integrated/services | yes | none |
| agent-lee-agentic-os | core/CentralGovernance.ts | standards | law duplication and policy drift risk | standards/contracts | projection runtime paths | validate only | LeeWay-Standards/src/runtime | yes | none |
| agent-lee-agentic-os | cortices/** | runtime-gpu | compute/runtime internals should not live in projection | standards/contracts | projection pages/components | runtime execute only | LeewayEdgeWebGPU/gpu or standalone runtime | yes | none |
| agent-lee-agentic-os | serviceAccountKey.json | external | secret material | n/a | n/a | none | secure secret store | yes | externalize |
| LeeWay-Agents-the-World-Within | workforce/** | projection-workforce | workforce catalog, role metadata, classification | standards/contracts, integrated service contracts | runtime internals, integrated/ui shell | projection backend only | LeeWay-Agents-the-World-Within/workforce | yes | none |
| LeeWay-Agents-the-World-Within | agents/** | projection-workforce | workforce and job family metadata | standards/contracts | runtime internals, integrated/ui shell | projection backend only | LeeWay-Agents-the-World-Within/agents | yes | none |
| LeeWay-Agents-the-World-Within | **/LeeWay-Standards/** | standards | nested standards copy drift | n/a | n/a | none | LeeWay-Standards root | yes | delete |
| LeeWay-Agents-the-World-Within | agents/*.gguf | external | large model binary | n/a | n/a | none | artifact/model registry | yes | externalize |
| LeeWay-Agents-the-World-Within | **/node_modules/** | external | dependency cache | n/a | n/a | none | n/a | yes | delete |
| LeeWay-Agents-the-World-Within | **/.venv/** | external | local environment cache | n/a | n/a | none | n/a | yes | delete |

## Allowed Layer Direction

1. standards -> integrated -> runtime
2. projection repos consume integrated and standards contracts
3. runtime repos consume standards contracts

## Forbidden Layer Direction

1. runtime -> integrated ui
2. projection -> runtime internals
3. projection -> standards runtime law internals
4. standards importing runtime or projection logic
5. any path that bypasses standards gate or integrated gate
