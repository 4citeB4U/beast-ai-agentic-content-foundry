/*
LEEWAY HEADER — DO NOT REMOVE
AUTHORITY: LeeWay-Standards

TAG: AI.VISION.AGENT.ADAPTER.OUTPUT
REGION: 🧠 AI
DISCOVERY_PIPELINE:
Awareness → Governance → Agent Adapter → Response

PURPOSE:
Translate awareness packets into agent-ready outputs.

CONSTRAINTS:
- Must not bypass governance
- Must not create independent reasoning logic

LICENSE: PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections


import type { AwarenessPacket, GovernanceVerdictVision } from './types';

export interface AgentOutput {
  suggestions: string[];
  confirmations: string[];
  actions: string[];
  blockedClaims: string[];
}

class VisionAdapter {
  adapt(
    packet: AwarenessPacket,
    verdict: GovernanceVerdictVision
  ): AgentOutput {
    const suggestions: string[] = [];
    const confirmations: string[] = [];
    const actions: string[] = [];
    const blockedClaims: string[] = [...verdict.blocked];

    // Build safe suggestions from allowed signals
    for (const fact of packet.facts) {
      if (fact.observable && fact.source.includes('face_detected')) {
        suggestions.push('Face detected in frame');
      }
    }

    for (const [name, signal] of Object.entries(packet.signals)) {
      if (name === 'brightness') {
        if (signal.numeric < 0.3) {
          suggestions.push(
            'Environment is dark - consider improving lighting'
          );
        } else if (signal.numeric > 0.8) {
          suggestions.push(
            'Environment is very bright - may cause glare issues'
          );
        }
      }

      if (name === 'motion' && signal.numeric > 0.5) {
        suggestions.push('Significant motion detected');
      }
    }

    // Confirmations require explicit user action
    const ocrText = packet.facts.find((f) => f.source === 'inspect.ocr_text');
    if (ocrText) {
      confirmations.push(
        `Confirm text recognition: "${ocrText.value}" [Y/N]`
      );
    }

    // Safe actions
    if (
      packet.confidence.overall > 0.7 &&
      packet.facts.some((f) => f.source === 'scan.face_detected')
    ) {
      actions.push('capture-frame');
      actions.push('log-detection');
    }

    return {
      suggestions,
      confirmations,
      actions,
      blockedClaims,
    };
  }
}

export default new VisionAdapter();
