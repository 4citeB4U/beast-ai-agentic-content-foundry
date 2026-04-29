/*
LEEWAY HEADER — DO NOT REMOVE

REGION: CORE
TAG: CORE.MODULE.SKILL_ATOM_BUS.MAIN
DESCRIPTION: Deterministic skill atom bus for capability toggles.
AUTHORITY: LeeWay-Standards
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render

LICENSE: PROPRIETARY
*/

export type SkillAtom = {
  id: string;
  enabled: boolean;
  voltage: number;
};

const atoms: SkillAtom[] = [
  { id: 'origin.intent.classifier', enabled: true, voltage: 1 },
  { id: 'veritas.validation.gate', enabled: true, voltage: 1 },
  { id: 'echo.memory.authority', enabled: true, voltage: 1 },
];

export const L5_SkillAtomBus = {
  list(): SkillAtom[] {
    return [...atoms];
  },

  setEnabled(id: string, enabled: boolean): boolean {
    const atom = atoms.find(a => a.id === id);
    if (!atom) return false;
    atom.enabled = enabled;
    atom.voltage = enabled ? 1 : 0;
    return true;
  },
};
