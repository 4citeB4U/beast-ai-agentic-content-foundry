/**
 * LEEWAY HEADER
 * TAG: CORE.SCORER.COMPLIANCE.MAIN
 * REGION: CORE
 * PURPOSE: Produce a normalized compliance score from rule booleans.
 *
 * DISCOVERY_PIPELINE:
 * Voice -> Intent -> Location -> Vertical -> Ranking -> Render
 *
 * 5WH:
 * WHAT = Compliance scorer
 * WHY = Convert governance booleans into a deterministic score
 * WHO = LeeWay Standards
 * WHERE = src/core/compliance-scorer.js
 * WHEN = 2026-04-21
 * HOW = Percentage score from required checks
 */

export function scoreCompliance(checks = {}) {
  const fields = ["hasHeader", "hasTag", "hasRegion", "hasDiscoveryPipeline"];
  const total = fields.length;
  const passed = fields.reduce((count, field) => count + (checks[field] ? 1 : 0), 0);
  const score = Math.round((passed / total) * 100);

  return {
    score,
    passed,
    total,
  };
}
