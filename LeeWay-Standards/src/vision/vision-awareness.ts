/*
LEEWAY HEADER — DO NOT REMOVE
AUTHORITY: LeeWay-Standards

TAG: AI.VISION.AWARENESS.PACKET.BUILDER
REGION: 🧠 AI
DISCOVERY_PIPELINE:
Vision → Signals → Normalization → Awareness → Packet

PURPOSE:
Convert raw vision outputs into structured, agent-consumable awareness packets.

CONSTRAINTS:
- Must not introduce reasoning beyond measurable facts
- Must remain compact and explainable

LICENSE: PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections


import type {
  MonitorState,
  AwarenessPacket,
  VisionFact,
  VisionSignal,
  VisionReading,
  VisionConfidence,
} from './types';
import type { ScanOutput } from './vision-scanner';
import type { InspectOutput } from './vision-inspect';

class AwarenessBuilder {
  private packetCounter = 0;

  buildPacket(
    monitorState: MonitorState | null,
    scanOutput: ScanOutput | null,
    inspectOutput: InspectOutput | null
  ): AwarenessPacket {
    const facts: VisionFact[] = [];
    const signals: Record<string, VisionSignal> = {};
    const readings: VisionReading[] = [];
    const limits: string[] = [];

    if (monitorState) {
      // Observable facts from monitor
      facts.push({
        observable: true,
        value: monitorState.brightness,
        source: 'monitor.brightness',
      });

      facts.push({
        observable: true,
        value: monitorState.motion,
        source: 'monitor.motion',
      });

      if (monitorState.facePresent) {
        facts.push({
          observable: true,
          value: true,
          source: 'monitor.face_detected',
        });
      }

      // Signals
      signals['brightness'] = {
        name: 'Brightness Level',
        numeric: monitorState.brightness,
        min: 0,
        max: 1,
        unit: 'normalized',
      };

      signals['motion'] = {
        name: 'Motion Intensity',
        numeric: monitorState.motion,
        min: 0,
        max: 1,
        unit: 'normalized',
      };

      readings.push({
        signal: 'brightness',
        value: monitorState.brightness,
        confidence: 0.9,
        timestamp: monitorState.ts,
      });

      readings.push({
        signal: 'motion',
        value: monitorState.motion,
        confidence: 0.85,
        timestamp: monitorState.ts,
      });
    }

    if (scanOutput) {
      facts.push({
        observable: scanOutput.faceBox !== null,
        value: scanOutput.faceBox !== null,
        source: 'scan.face_detected',
      });

      if (scanOutput.textRegions.length > 0) {
        facts.push({
          observable: true,
          value: scanOutput.textRegions.length,
          source: 'scan.text_regions_found',
        });
      }

      signals['scan_confidence'] = {
        name: 'Scan Confidence',
        numeric: scanOutput.scanConfidence,
        min: 0,
        max: 1,
        unit: 'confidence',
      };

      readings.push({
        signal: 'scan_confidence',
        value: scanOutput.scanConfidence,
        confidence: 0.8,
        timestamp: scanOutput.ts,
      });

      limits.push('Text OCR requires confirmation prompts');
      limits.push('Scene classification uncertain below 0.7 confidence');
    }

    if (inspectOutput) {
      if (inspectOutput.ocr) {
        facts.push({
          observable: true,
          value: inspectOutput.ocr,
          source: 'inspect.ocr_text',
        });
      }

      signals['eye_openness'] = {
        name: 'Eye Openness Estimate',
        numeric: inspectOutput.eyeOpenness,
        min: 0,
        max: 1,
        unit: 'proportion',
      };

      signals['mouth_openness'] = {
        name: 'Mouth Openness Estimate',
        numeric: inspectOutput.mouthOpenness,
        min: 0,
        max: 1,
        unit: 'proportion',
      };

      signals['head_tilt'] = {
        name: 'Head Tilt Angle',
        numeric: inspectOutput.headTiltDeg,
        min: -45,
        max: 45,
        unit: 'degrees',
      };

      readings.push({
        signal: 'eye_openness',
        value: inspectOutput.eyeOpenness,
        confidence: inspectOutput.inspectConfidence,
        timestamp: inspectOutput.ts,
      });

      limits.push(
        'Eye/mouth openness are estimates, not medical measurements'
      );
      limits.push('Head tilt accuracy ±15° due to 2D analysis');
    }

    // Overall confidence
    const allConfidences = readings.map((r) => r.confidence);
    const overallConfidence =
      allConfidences.length > 0
        ? allConfidences.reduce((a, b) => a + b) / allConfidences.length
        : 0;

    const confidence: VisionConfidence = {
      monitor: monitorState ? 0.9 : 0,
      scan: scanOutput ? scanOutput.scanConfidence : 0,
      inspect: inspectOutput ? inspectOutput.inspectConfidence : 0,
      overall: overallConfidence,
    };

    // Generic limits
    limits.push('No emotional or medical certainty claims');
    limits.push('2D vision cannot infer internal state');

    return {
      ts: Date.now(),
      id: `packet-${Date.now()}-${this.packetCounter++}`,
      facts,
      signals,
      readings,
      confidence,
      limits,
      runtimeMode: monitorState?.runtimeMode || 'balanced',
    };
  }
}

export default new AwarenessBuilder();
