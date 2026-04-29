/*
LEEWAY HEADER — DO NOT REMOVE
AUTHORITY: LeeWay-Standards

TAG: CORE.GOVERNANCE.VISION.EXTENSION
REGION: 🟢 CORE
DISCOVERY_PIPELINE:
Vision → Awareness → Governance → Filter → Output

PURPOSE:
Extend the existing governance system to include vision-specific constraints.

CONSTRAINTS:
- Must NOT create a new governance system
- Must integrate into existing GOVERNOR / Guardian logic

LICENSE: PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections


import type {
  AwarenessPacket,
  GovernanceVerdictVision,
} from './types';

class VisionGovernance {
  evaluate(packet: AwarenessPacket): GovernanceVerdictVision {
    const allowed: string[] = [];
    const blocked: string[] = [];
    const warnings: string[] = [];

    // Observable facts are allowed
    for (const fact of packet.facts) {
      if (fact.observable) {
        allowed.push(`Fact: ${fact.source} = ${fact.value}`);
      }
    }

    // Numeric signals are allowed with confidence
    for (const [name, signal] of Object.entries(packet.signals)) {
      if (signal.numeric >= 0 && signal.numeric <= 1) {
        allowed.push(`Signal: ${name} = ${signal.numeric.toFixed(2)}`);
      }
    }

    // Block dangerous claims
    const dangerousKeywords = [
      'diagnosis',
      'medical',
      'disease',
      'emotion',
      'feeling',
      'intent',
      'lie',
      'truth',
      'stressed',
      'happy',
      'sad',
      'angry',
    ];

    for (const fact of packet.facts) {
      const valueStr = String(fact.value).toLowerCase();
      if (dangerousKeywords.some((kw) => valueStr.includes(kw))) {
        blocked.push(
          `Blocked: ${fact.source} - no emotional/medical certainty allowed`
        );
      }
    }

    // Require confidence thresholds
    if (packet.confidence.overall < 0.6) {
      warnings.push(
        `Low overall confidence: ${(packet.confidence.overall * 100).toFixed(0)}% - results unreliable`
      );
    }

    // Enforce limits
    for (const limit of packet.limits) {
      warnings.push(`Constraint: ${limit}`);
    }

    const compliant = blocked.length === 0;

    return {
      allowed,
      blocked,
      warnings,
      compliant,
    };
  }
}

export default new VisionGovernance();
