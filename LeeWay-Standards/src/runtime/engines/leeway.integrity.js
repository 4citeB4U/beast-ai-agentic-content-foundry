/*
LEEWAY HEADER — DO NOT REMOVE

REGION: CORE
TAG: CORE.MODULE.LEEWAY_INTEGRITY.MAIN
DESCRIPTION: Auto-enforced by LeeWay Standards Enforcement Engine
AUTHORITY: LeeWay-Standards
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

5WH:
WHAT = leeway.integrity — governed module
WHY = Enforce LeeWay architectural standards in this file
WHO = Leeway Industries / LeeWay Standards Enforcement Engine
WHERE = runtime/leeway.integrity.js
WHEN = 2026-04-18
HOW = Auto-enforced header; update manually with full 5WH detail

CHAIN: Standards → Integrated → Runtime → Projections
LICENSE: PROPRIETARY
*/

import { LEEWAY_RUNTIME_SIGNATURE, ENGINE_SIGNATURES } from './signature.engine.js';

export class LeewayIntegrity {
  static async verifyCore(audit) {
    const pass =
      LEEWAY_RUNTIME_SIGNATURE &&
      LEEWAY_RUNTIME_SIGNATURE.system === 'LEEWAY_UNIVERSE' &&
      LEEWAY_RUNTIME_SIGNATURE.runtime === 'AGENT_LEE_OS';

    if (audit) {
      await audit.integrity('CORE_SIGNATURE', pass ? 'PASS' : 'FAIL', {
        sig: LEEWAY_RUNTIME_SIGNATURE
      });
    }
    return pass; // Return boolean instead of throwing
  }

  static async verifyEngine(name, signature, audit) {
    const expected = ENGINE_SIGNATURES[name];
    const pass = expected && signature === expected;

    if (audit) {
      await audit.integrity('ENGINE_SIGNATURE', pass ? 'PASS' : 'FAIL', {
        name, expected, received: signature
      });
    }
    if (!pass) throw new Error(`LEEWAY_ENGINE_TAMPERED: ${name}`);
  }

  static async enforceContext(context, audit) {
    const pass = !!(context?.identity && context?.pallium && context?.roomId);

    if (audit) {
      await audit.integrity('CONTEXT_ENFORCE', pass ? 'PASS' : 'FAIL', {
        hasIdentity: !!context?.identity,
        hasPallium: !!context?.pallium,
        roomId: context?.roomId
      });
    }
    if (!pass) throw new Error('LEEWAY_RUNTIME_CONTEXT_INVALID');
  }
}