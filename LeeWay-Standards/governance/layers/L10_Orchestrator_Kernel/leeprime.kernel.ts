/*
LEEWAY HEADER — DO NOT REMOVE

REGION: CORE
TAG: CORE.MODULE.LEEPRIME_KERNEL.MAIN
DESCRIPTION: Sovereign orchestration kernel state for cycle governance.
AUTHORITY: LeeWay-Standards
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render

LICENSE: PROPRIETARY
*/

export type KernelPhase = 'idle' | 'perceiving' | 'planning' | 'executing' | 'validating' | 'delivering';

let activePhase: KernelPhase = 'idle';

export const L10_LeePrimeKernel = {
  getPhase(): KernelPhase {
    return activePhase;
  },

  transition(next: KernelPhase): KernelPhase {
    activePhase = next;
    return activePhase;
  },
};
