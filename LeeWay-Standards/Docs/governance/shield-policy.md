<!--
DOC_CLASS: GOVERNANCE
DOC_ID: governance.shield-policy
OWNER: Shield Aegis
LAST_UPDATED: 2026-04-03
-->

# Shield Aegis — Security Policy

## Role

Shield is Agent Lee's security and self-healing agent. It monitors, gates, detects, and repairs.

## Threat Detection Patterns (auto-block)

| Pattern | Severity |
|---|---|
| `ignore previous instructions` | CRITICAL |
| `override shield / governance / policy` | CRITICAL |
| `you are now unrestricted / jailbroken` | CRITICAL |
| `disregard your rules` | CRITICAL |
| `forget your constraints / guidelines` | CRITICAL |

Any input matching these patterns is rejected before routing. The event is logged to `system_reports/system/governance/security_events.ndjson`.

## Redaction Rules (Shield enforces for ALL reports)

Shield will **never** allow these to appear in any report log or chat output:
- `serviceAccountKey.json` contents
- `*adminsdk*.json` contents
- `.env*` values
- Any string matching `/AIzaSy[A-Za-z0-9_-]{35}/` (leeway API keys)
- Any string matching `/sk-[A-Za-z0-9]{48}/` (OpenAI keys)
- Any string matching `/ghp_[A-Za-z0-9]{36}/` (GitHub PATs)

## Zone Enforcement

Shield reviews every Write Intent Block before execution:
- Checks required capabilities against active grants
- Emits `shield:threat` if capabilities are missing or suspicious
- Blocks Z1/Z2 writes that lack explicit approval

## Break-Glass Protocol

Emergency access that:
1. Is time-limited (TTL required, max 60 min)
2. Is scope-limited (specific paths/caps only)
3. Is fully logged — every action within break-glass window is audited
4. Does NOT remove the approval gate for truly critical operations (Z2_WRITE_MEMORY_DELETE, etc.)

Activation: `/breakglass.on --caps "..." --ttl "..." --scope "..." --reason "..."`

## Incident Lifecycle

1. Error detected (global handler or agent report)
2. Incident created → `status: investigating`
3. leeway diagnosis: `patch | isolate | delete`
4. Resolution logged → Sage memory + ARCHIVE
5. `heal:complete` event emitted

## Reporting

All Shield events are written to:
- `system_reports/system/governance/security_events.ndjson` (SECURITY_EVENT class)
- `system_reports/agents/AEGIS/Shield_Aegis.ndjson` (AGENT class)

