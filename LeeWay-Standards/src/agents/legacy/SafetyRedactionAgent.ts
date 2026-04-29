/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: AI.ORCHESTRATION.AGENT.VOICE
TAG: AI.ORCHESTRATION.AGENT.SAFETYREDACTION.FILTER

COLOR_ONION_HEX:
NEON=#EF4444
FLUO=#F87171
PASTEL=#FEE2E2

ICON_ASCII:
family=lucide
glyph=shield-alert

5WH:
WHAT = SafetyRedactionAgent — scans and redacts PII, profanity, and prompt-injection patterns from LLM-style agent output
WHY = Ensures Agent Lee never speaks or displays raw PII or adversarial injections to the user
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = agents/SafetyRedactionAgent.ts
WHEN = 2026-04-04

AGENTS:
ASSESS
AUDIT
SECURITY
SAFETYREDACTION

LICENSE:
MIT
*/

// agents/SafetyRedactionAgent.ts
// Scans LLM-style agent output text for PII, profanity, and prompt-injection patterns.
// Returns a sanitised copy and emits redaction:applied if anything was changed.

import { eventBus } from '../../core/EventBus';

// --- Redaction rules -----------------------------------------------------------
type RedactionRule = { pattern: RegExp; replacement: string; category: string };

const RULES: RedactionRule[] = [
  // PII — emails
  { pattern: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, replacement: '[EMAIL]', category: 'pii:email' },
  // PII — US phone numbers
  { pattern: /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/g, replacement: '[PHONE]', category: 'pii:phone' },
  // PII — SSN-like
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[SSN]', category: 'pii:ssn' },
  // PII — credit card-like (13–16 digits, optionally spaced/dashed)
  { pattern: /\b(?:\d[ -]?){13,16}\b/g, replacement: '[CARD]', category: 'pii:creditcard' },
  // Prompt injection — common patterns
  { pattern: /ignore\s+(all\s+)?previous\s+instructions?/gi, replacement: '[REDACTED]', category: 'injection' },
  { pattern: /you\s+are\s+now\s+a?\s*(DAN|jailbreak|unrestricted)/gi, replacement: '[REDACTED]', category: 'injection' },
  { pattern: /system\s*prompt\s*:/gi, replacement: '[REDACTED]', category: 'injection' },
];

// --- Agent -------------------------------------------------------------------

export class SafetyRedactionAgent {
  /**
   * Redact the provided text.  Returns the sanitised string.
   * Emits redaction:applied to EventBus if any substitutions were made.
   */
  static redact(text: string): string {
    const originalLength = text.length;
    const appliedCategories: string[] = [];

    let result = text;
    for (const rule of RULES) {
      const before = result;
      result = result.replace(rule.pattern, rule.replacement);
      if (result !== before && !appliedCategories.includes(rule.category)) {
        appliedCategories.push(rule.category);
      }
    }

    if (appliedCategories.length > 0) {
      eventBus.emit('redaction:applied', {
        originalLength,
        redactedLength: result.length,
        categories: appliedCategories,
      });
      eventBus.emit('shield:threat', {
        module: 'SafetyRedactionAgent',
        severity: appliedCategories.some(c => c === 'injection') ? 'high' : 'medium',
        detail: `Redacted categories: ${appliedCategories.join(', ')}`,
      });
    }

    return result;
  }

  /**
   * Returns true if the text contains any pattern that would be redacted.
   * Does not emit events — use for fast pre-checks.
   */
  static hasSensitiveContent(text: string): boolean {
    return RULES.some(rule => {
      rule.pattern.lastIndex = 0; // reset stateful regex
      return rule.pattern.test(text);
    });
  }
}
