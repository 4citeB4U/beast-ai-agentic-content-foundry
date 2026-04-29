/*
LEEWAY HEADER
TAG: INTEGRATED.RUNTIME.ADAPTER.CORTICES
REGION: INTEGRATED
DESCRIPTION: Cortices Adapter Contracts — Integrated-layer ownership declaration
AUTHORITY: LeeWay-Standards
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
CHAIN: Standards → Integrated → Runtime → Projections
LICENSE: PROPRIETARY
*/

/**
 * LEEWAY CORTICES ADAPTER CONTRACTS
 *
 * This file declares the adapter surface that Integrated owns for cortices.
 * Projections (agent-lee-agentic-os, LeeWay-Agents-the-World-Within) must NOT
 * import cortices directly. They must route through these adapter contracts.
 *
 * Execution Chain: Standards → Integrated → Runtime → Projections
 * Layer Rule: Projection → Runtime edge is FORBIDDEN per LeeWay-Standards
 *
 * Cortex modules owned here:
 *  - retrieval/RetrievalCortex  → owned by Integrated, surfaces via MCP
 *  - build/BuildCortex          → owned by Integrated, surfaces via MCP
 *  - creative/CodeStudio        → owned by Integrated, surfaces via MCP
 *  - creative/CreatorsStudio    → owned by Integrated, surfaces via MCP
 *  - visual/*                   → owned by Integrated
 *  - sensory/*                  → owned by Integrated
 */

// ─── Adapter Contract Types ──────────────────────────────────────────────────

export interface CortexAdapterContract {
  cortexId: string;
  layer: 'retrieval' | 'build' | 'creative' | 'visual' | 'sensory';
  ownedBy: 'LeeWay-Edge-Integrated';
  exposedVia: 'MCP' | 'adapter' | 'pending';
  projectionsAllowed: string[];
}

// ─── Registered Cortex Contracts ─────────────────────────────────────────────

export const CORTEX_ADAPTER_REGISTRY: CortexAdapterContract[] = [
  {
    cortexId: 'retrieval/RetrievalCortex',
    layer: 'retrieval',
    ownedBy: 'LeeWay-Edge-Integrated',
    exposedVia: 'pending',
    projectionsAllowed: ['agent-lee-agentic-os', 'leeway-agents'],
  },
  {
    cortexId: 'build/BuildCortex',
    layer: 'build',
    ownedBy: 'LeeWay-Edge-Integrated',
    exposedVia: 'pending',
    projectionsAllowed: ['agent-lee-agentic-os'],
  },
  {
    cortexId: 'creative/CodeStudio',
    layer: 'creative',
    ownedBy: 'LeeWay-Edge-Integrated',
    exposedVia: 'pending',
    projectionsAllowed: ['agent-lee-agentic-os'],
  },
  {
    cortexId: 'creative/CreatorsStudio',
    layer: 'creative',
    ownedBy: 'LeeWay-Edge-Integrated',
    exposedVia: 'pending',
    projectionsAllowed: ['agent-lee-agentic-os'],
  },
];

/**
 * Look up a cortex contract by ID.
 * Used by the enforcement engine to validate projection access attempts.
 */
export function getCortexContract(
  cortexId: string
): CortexAdapterContract | undefined {
  return CORTEX_ADAPTER_REGISTRY.find((c) => c.cortexId === cortexId);
}

/**
 * Assert that a projection is allowed to access a cortex.
 * Throws if the access is not declared in the registry.
 */
export function assertCortexAccess(cortexId: string, projectionId: string): void {
  const contract = getCortexContract(cortexId);
  if (!contract) {
    throw new Error(
      `[LEEWAY ENFORCEMENT] Cortex '${cortexId}' has no registered adapter contract. ` +
        `Add it to CORTEX_ADAPTER_REGISTRY in cortices-adapter-contracts.ts`
    );
  }
  if (!contract.projectionsAllowed.includes(projectionId)) {
    throw new Error(
      `[LEEWAY ENFORCEMENT] Projection '${projectionId}' is not authorized to access cortex '${cortexId}'. ` +
        `Update the adapter contract to grant access.`
    );
  }
}
