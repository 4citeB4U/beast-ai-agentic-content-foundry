/**
 * LEEWAY HEADER
 * TAG: CORE.PARSER.HEADER.MAIN
 * REGION: CORE
 * PURPOSE: Parse LeeWay header metadata from source text.
 *
 * DISCOVERY_PIPELINE:
 * Voice -> Intent -> Location -> Vertical -> Ranking -> Render
 *
 * 5WH:
 * WHAT = Header metadata parser
 * WHY = Extract REGION and TAG values from governed files
 * WHO = LeeWay Standards
 * WHERE = src/core/header-parser.js
 * WHEN = 2026-04-21
 * HOW = Regex extraction from source comment blocks
 */

export function parseHeader(source = "") {
  const tagMatch = source.match(/TAG:\s*([^\n\r]+)/);
  const regionMatch = source.match(/REGION:\s*([^\n\r]+)/);

  return {
    tag: tagMatch ? tagMatch[1].trim() : "",
    region: regionMatch ? regionMatch[1].trim() : "",
  };
}
