/*
LEEWAY HEADER — DO NOT REMOVE
AUTHORITY: LeeWay-Standards

TAG: CORE.DIAGNOSTICS.VISION.RUNTIME
REGION: 🟢 CORE
DISCOVERY_PIPELINE:
Runtime → Metrics → Diagnostics → Display

PURPOSE:
Extend diagnostics to include vision runtime visibility.

CONSTRAINTS:
- Must integrate into existing diagnostics system
- Must remain lightweight

LICENSE: PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections


import type { RuntimeMode, VisionDiagnostics } from './types';

class VisionDiagnosticsEngine {
  private monitorActive = false;
  private monitorLatency = 0;
  private lastScanTime = 0;
  private lastInspectTime = 0;
  private packetSizeEstimate = 0;
  private cpuEstimate = 0;

  setMonitorActive(active: boolean): void {
    this.monitorActive = active;
  }

  recordMonitorLatency(ms: number): void {
    this.monitorLatency = ms;
    this.cpuEstimate = Math.min(ms / 33, 3); // Estimate % CPU
  }

  recordScan(): void {
    this.lastScanTime = Date.now();
  }

  recordInspect(): void {
    this.lastInspectTime = Date.now();
  }

  setPacketSize(bytes: number): void {
    this.packetSizeEstimate = bytes;
  }

  getDiagnostics(runtimeMode: RuntimeMode): VisionDiagnostics {
    return {
      monitorActive: this.monitorActive,
      monitorLatency: this.monitorLatency,
      lastScanTime: this.lastScanTime,
      lastInspectTime: this.lastInspectTime,
      packetSize: this.packetSizeEstimate,
      cpuEstimate: this.cpuEstimate,
      runtimeMode,
    };
  }
}

export default new VisionDiagnosticsEngine();
