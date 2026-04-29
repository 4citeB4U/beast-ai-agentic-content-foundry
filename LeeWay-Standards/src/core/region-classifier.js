/**
 * LEEWAY HEADER
 * TAG: CORE.CLASSIFIER.REGION.MAIN
 * REGION: CORE
 * PURPOSE: Map tag namespaces to LeeWay region labels.
 *
 * DISCOVERY_PIPELINE:
 * Voice -> Intent -> Location -> Vertical -> Ranking -> Render
 *
 * 5WH:
 * WHAT = Region classifier
 * WHY = Normalize tag namespaces into canonical region outputs
 * WHO = LeeWay Standards
 * WHERE = src/core/region-classifier.js
 * WHEN = 2026-04-21
 * HOW = Prefix-based tag classification
 */

export function classifyRegion(tag = "") {
  const normalized = String(tag).toUpperCase();

  if (normalized.startsWith("UI.")) {
    return "UI";
  }
  if (normalized.startsWith("CORE.")) {
    return "CORE";
  }
  if (normalized.startsWith("DATA.")) {
    return "DATA";
  }
  if (normalized.startsWith("UTIL.")) {
    return "UTIL";
  }
  return "CORE";
}
