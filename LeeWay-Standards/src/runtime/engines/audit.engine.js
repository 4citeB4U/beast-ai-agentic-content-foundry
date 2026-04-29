/*
LEEWAY HEADER — DO NOT REMOVE

REGION: CORE
TAG: CORE.MODULE.AUDIT_ENGINE.MAIN
DESCRIPTION: Auto-enforced by LeeWay Standards Enforcement Engine
AUTHORITY: LeeWay-Standards
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

5WH:
WHAT = audit.engine — governed module
WHY = Enforce LeeWay architectural standards in this file
WHO = Leeway Industries / LeeWay Standards Enforcement Engine
WHERE = runtime/audit.engine.js
WHEN = 2026-04-18
HOW = Auto-enforced header; update manually with full 5WH detail

CHAIN: Standards → Integrated → Runtime → Projections
LICENSE: PROPRIETARY
*/

/**
 * © 2026 LeeWay Systems
 * Audit Engine — LeeWay Runtime
 */

export class AuditEngine {
  constructor({ pallium, identity, roomId }) {
    this.pallium = pallium;
    this.identity = identity;
    this.roomId = roomId;
    this.correlationId = AuditEngine._newId();
    this.previousHash = null; // For chain integrity
  }

  static _newId() {
    return 'corr_' + Math.random().toString(36).slice(2) + Date.now();
  }

  async write(entry) {
    const logDB = this.pallium?.getDB('log');
    const record = {
      ts: Date.now(),
      roomId: this.roomId,
      userId: this.identity?.userId,
      correlationId: this.correlationId,
      previousHash: this.previousHash,
      ...entry
    };

    // Generate hash of current record + previous hash for tamper-evident chain
    const recordString = JSON.stringify({ ...record, hash: undefined }); // Exclude hash from input
    record.hash = await this._generateHash(recordString + (this.previousHash || ''));

    // Update previous hash for next record
    this.previousHash = record.hash;

    // IndexedDB minimal write helper (wrap to your existing helper if present)
    try {
      const req = logDB.transaction(['store'], 'readwrite')
        .objectStore('store')
        .add(record);
      await new Promise((res, rej) => {
        req.onsuccess = res;
        req.onerror = () => rej(req.error);
      });
    } catch (e) {
      // Fallback console (never block runtime on logging)
      console.warn('AUDIT_WRITE_FAIL', record, e);
    }
  }

  async _generateHash(input) {
    // Simple hash for tamper detection (can be upgraded to crypto.subtle if needed)
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  async integrity(event, result, meta = {}) {
    return this.write({
      type: 'INTEGRITY',
      event,
      result, // 'PASS' | 'FAIL'
      meta
    });
  }

  async lifecycle(event, meta = {}) {
    return this.write({
      type: 'LIFECYCLE',
      event,
      meta
    });
  }

  async security(event, meta = {}) {
    return this.write({
      type: 'SECURITY',
      event,
      meta
    });
  }
}