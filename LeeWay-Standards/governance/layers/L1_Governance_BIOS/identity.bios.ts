/*
LEEWAY HEADER — DO NOT REMOVE

REGION: CORE
TAG: CORE.MODULE.IDENTITY_BIOS.MAIN
DESCRIPTION: Governance BIOS identity gate for workload admission.
AUTHORITY: LeeWay-Standards
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render

LICENSE: PROPRIETARY
*/

const TRUSTED_SERIAL_PREFIX = 'LEEWAY-';

export const L1_BIOS = {
  checkIntegrity(serial: string): boolean {
    if (!serial || typeof serial !== 'string') return false;
    return serial.startsWith(TRUSTED_SERIAL_PREFIX);
  },

  issueSerial(nodeId: string): string {
    const clean = nodeId.replace(/[^a-zA-Z0-9-_]/g, '').toUpperCase();
    return `${TRUSTED_SERIAL_PREFIX}${clean || 'NODE'}-${Date.now()}`;
  },
};
