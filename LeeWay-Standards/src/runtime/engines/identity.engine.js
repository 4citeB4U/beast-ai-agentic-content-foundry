/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards
REGION: RUNTIME.IDENTITY
TAG: ENGINE.IDENTITY
WHAT = Identity engine for rooms, sessions, workers and agents
WHY = Provides deterministic IDs, identity registry, and signed identity records
WHO = Leeway Industries
*/
// CHAIN: Standards → Integrated → Runtime → Projections


import { ENGINE_SIGNATURES } from './signature.engine.js';
import { LeewayIntegrity } from './leeway.integrity.js';

const identityRegistry = new Map();

export class IdentityEngine {
  static signature = ENGINE_SIGNATURES.identity;

  static async init(audit) {
    const coreVerified = await LeewayIntegrity.verifyCore(audit);
    if (!coreVerified) throw new Error('LEEWAY_CORE_SIGNATURE_INVALID');
    await LeewayIntegrity.verifyEngine('identity', this.signature, audit);

    return {
      userId: this.generateId('user')
    };
  }

  static generateId(prefix) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return `${prefix}-${crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  static normalize(record) {
    return {
      ...record,
      createdAt: new Date().toISOString(),
      normalized: true,
    };
  }

  static async sign(record) {
    const payload = `${record.id}|${record.type}|${record.createdAt}`;
    if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
      return crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload)).then(hash => {
        return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
      });
    }
    return Promise.resolve(btoa(payload).slice(0, 32));
  }

  static async createRecord(type, meta = {}) {
    const id = this.generateId(type);
    const record = this.normalize({ id, type, ...meta });
    const signature = await this.sign(record);
    const signed = { ...record, signature };
    identityRegistry.set(id, signed);
    return signed;
  }

  static async createRoomIdentity(meta = {}) {
    return this.createRecord('room', meta);
  }

  static async createSessionIdentity(meta = {}) {
    return this.createRecord('session', meta);
  }

  static async createWorkerIdentity(meta = {}) {
    return this.createRecord('worker', meta);
  }

  static async createAgentIdentity(meta = {}) {
    return this.createRecord('agent', meta);
  }

  static getIdentity(id) {
    return identityRegistry.get(id) || null;
  }

  static lookupByType(type) {
    return Array.from(identityRegistry.values()).filter(entry => entry.type === type);
  }

  static async signIdentityRecord(record) {
    const signature = await this.sign(record);
    return { ...record, signature };
  }
}
