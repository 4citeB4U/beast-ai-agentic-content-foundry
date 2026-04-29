/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards
REGION: RUNTIME.RTC
TAG: ADAPTER.RTC
WHAT = RTC adapter for the Integrated motherboard shell
WHY = Exposes the existing RTC bridge with a runtime-compatible API
WHO = Leeway Industries
*/
// CHAIN: Standards → Integrated → Runtime → Projections


import { rtcBridge } from '../gpu/rtc/gpu.rtc.bridge.js';
import { ENGINE_SIGNATURES } from './signature.engine.js';
import { LeewayIntegrity } from './leeway.integrity.js';

export class RtcAdapter {
  static signature = ENGINE_SIGNATURES.rtc;

  static async connect(context, apiKey = '-leeway23-edgegpu') {
    const { audit, roomId, pallium } = context;

    await LeewayIntegrity.verifyEngine('rtc', this.signature, audit);

    if (!roomId) {
      throw new Error('RTC_CONTEXT_INVALID');
    }

    rtcBridge.room = roomId;

    const logDB = pallium?.getDB('log');
    if (logDB && typeof logDB.transaction === 'function') {
      try {
        const tx = logDB.transaction('log', 'readwrite');
        tx.objectStore('log').add({ event: 'RTC_CONNECT', roomId, timestamp: new Date().toISOString() });
      } catch (err) {
        console.warn('RTC log write failed', err);
      }
    }

    const result = await rtcBridge.connectToHive(apiKey);
    if (result) {
      return { ok: true, status: rtcBridge.status, room: roomId };
    }
    return { ok: false, status: rtcBridge.status, room: roomId };
  }

  static broadcastTelemetry(agentId, level, msg) {
    rtcBridge.broadcastTelemetry(agentId, level, msg);
  }

  static getStatus() {
    return { status: rtcBridge.status, room: rtcBridge.room };
  }

  static async disconnect(roomId) {
    return rtcBridge?.disconnect?.(roomId);
  }
}
