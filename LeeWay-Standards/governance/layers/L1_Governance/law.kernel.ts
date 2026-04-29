/*
LEEWAY HEADER — DO NOT REMOVE

REGION: CORE
TAG: CORE.MODULE.LAW_KERNEL.MAIN
DESCRIPTION: Canonical governance law kernel for deterministic policy checks.
AUTHORITY: LeeWay-Standards
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render

LICENSE: PROPRIETARY
*/

export type GovernanceDirective = {
  id: string;
  name: string;
  enforced: boolean;
  description: string;
};

const DIRECTIVES: GovernanceDirective[] = [
  {
    id: 'LAW-001',
    name: 'VERITAS_BEFORE_DELIVERY',
    enforced: true,
    description: 'No user-facing output without validation pass.',
  },
  {
    id: 'LAW-002',
    name: 'ECHO_MEMORY_AUTHORITY',
    enforced: true,
    description: 'Only Echo-approved pathways may write durable memory.',
  },
  {
    id: 'LAW-003',
    name: 'LEE_PRIME_FINAL_SPEAKER',
    enforced: true,
    description: 'Only Lee Prime may perform final delivery.',
  },
];

export const L1_GovernanceKernel = {
  listDirectives(): GovernanceDirective[] {
    return [...DIRECTIVES];
  },

  isDirectiveEnforced(id: string): boolean {
    return DIRECTIVES.some(d => d.id === id && d.enforced);
  },
};
