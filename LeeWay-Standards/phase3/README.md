# Phase 3 — Core Authority and Collaborative Runtime Upgrades

This package adds four high-impact runtime upgrades to the Leeway Agent Lee stack:

1. Advanced Veritas scoring with weighted rule graphs and confidence/disposition outputs.
2. Echo memory indexing with token-based semantic clustering and receipt logging, without embeddings.
3. Multi-agent collaboration through Origin ↔ Echo ↔ Vector ↔ Structure negotiation.
4. Live Brain Diagnostics UI for watching the execution cycle in real time.

## Files

- `src/core/veritas/VeritasCore.ts`
- `src/core/echo/EchoCore.ts`
- `src/core/collaboration/CoreNegotiator.ts`
- `src/core/lee-prime/ExecutionEngine.ts`
- `src/core/diagnostics/DiagnosticsBus.ts`
- `src/ui/diagnostics/BrainDiagnosticsPanel.tsx`
- `src/types/runtime.ts`

## Notes

- No LLM dependency is introduced.
- Echo remains the only long-term memory write authority.
- Veritas remains the mandatory validation gate before delivery.
- Diagnostics are event-driven and receipt-backed.
