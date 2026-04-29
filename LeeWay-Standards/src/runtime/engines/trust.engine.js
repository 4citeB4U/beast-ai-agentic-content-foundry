/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards
REGION: RUNTIME.TRUST
TAG: ENGINE.TRUST
WHAT = Trust engine for runtime permission and execution safety
WHY = Validates room joins, media permissions, and compute authorization
WHO = Leeway Industries
*/
// CHAIN: Standards → Integrated → Runtime → Projections


import { ENGINE_SIGNATURES } from './signature.engine.js';
import { LeewayIntegrity } from './leeway.integrity.js';

const trustHistory = [];

export class TrustEngine {
  static signature = ENGINE_SIGNATURES.trust;

  static async apply(identity, audit) {
    const coreVerified = await LeewayIntegrity.verifyCore(audit);
    if (!coreVerified) throw new Error('LEEWAY_CORE_SIGNATURE_INVALID');
    await LeewayIntegrity.verifyEngine('trust', this.signature, audit);

    return {
      identityId: identity?.userId || 'anonymous',
      score: 100,
      capabilities: ['room.join', 'media.access', 'task.execute']
    };
  }

  static scoreTrust(entry) {
    const base = 100;
    const penalty = entry.flags?.length ? entry.flags.length * 10 : 0;
    return Math.max(0, base - penalty);
  }

  static buildTrustEvent({ identity, action, result, reason }) {
    const event = {
      id: `trust-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      identityId: identity?.id || 'anonymous',
      action,
      result,
      reason,
      score: this.scoreTrust({ flags: reason ? [reason] : [] }),
    };
    trustHistory.unshift(event);
    return event;
  }

  static validateRoomJoin({ identity, room }) {
    if (!identity || !room) {
      return this.buildTrustEvent({ identity, action: 'room.join', result: 'deny', reason: 'missing_identity_or_room' });
    }
    if (room.locked) {
      return this.buildTrustEvent({ identity, action: 'room.join', result: 'deny', reason: 'room_locked' });
    }
    return this.buildTrustEvent({ identity, action: 'room.join', result: 'allow' });
  }

  static validateMediaAccess({ identity, room, kind }) {
    if (!identity || !room) {
      return this.buildTrustEvent({ identity, action: `media.${kind}`, result: 'deny', reason: 'missing_identity_or_room' });
    }
    if (room.roles?.[identity.id] === 'visitor' && kind === 'camera') {
      return this.buildTrustEvent({ identity, action: `media.${kind}`, result: 'deny', reason: 'visitor_camera_blocked' });
    }
    return this.buildTrustEvent({ identity, action: `media.${kind}`, result: 'allow' });
  }

  static validateTaskExecution({ identity, task, capabilityProfile }) {
    if (!identity || !task) {
      return this.buildTrustEvent({ identity, action: 'task.execute', result: 'deny', reason: 'missing_identity_or_task' });
    }
    if (capabilityProfile?.trusted === false) {
      return this.buildTrustEvent({ identity, action: 'task.execute', result: 'deny', reason: 'untrusted_capability_profile' });
    }
    return this.buildTrustEvent({ identity, action: 'task.execute', result: 'allow' });
  }

  static recordTrustDecision(decision) {
    const event = { ...decision, recordedAt: new Date().toISOString() };
    trustHistory.unshift(event);
    return event;
  }

  static getTrustHistory() {
    return [...trustHistory];
  }
}
