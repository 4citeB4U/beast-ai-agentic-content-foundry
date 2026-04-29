/*
LEEWAY HEADER — DO NOT REMOVE
AUTHORITY: LeeWay-Standards

TAG: DATA.LOCAL.VISION.STORE.MAIN
REGION: 💾 DATA
DISCOVERY_PIPELINE:
Vision → Packet → Storage → Retrieval

PURPOSE:
Store vision outputs using existing local storage patterns.

CONSTRAINTS:
- Must not introduce heavy storage
- Must remain compact

LICENSE: PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections


import type { AwarenessPacket } from './types';

const STORAGE_KEY = 'leeway-vision-packets';
const MAX_PACKETS = 50;

class VisionStorage {
  savePacket(packet: AwarenessPacket): void {
    try {
      const packets = this.loadPackets();
      packets.push(packet);

      // Keep only latest MAX_PACKETS
      if (packets.length > MAX_PACKETS) {
        packets.shift();
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(packets));
    } catch (err) {
      console.warn('Vision storage failed:', err);
    }
  }

  loadPackets(): AwarenessPacket[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (err) {
      console.warn('Vision storage read failed:', err);
      return [];
    }
  }

  getLatestPacket(): AwarenessPacket | null {
    const packets = this.loadPackets();
    return packets[packets.length - 1] || null;
  }

  clearAll(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  getPacketSize(): number {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? new Blob([data]).size : 0;
    } catch (err) {
      return 0;
    }
  }
}

export default new VisionStorage();
