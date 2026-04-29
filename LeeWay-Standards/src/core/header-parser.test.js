/*
LEEWAY HEADER — DO NOT REMOVE

REGION: CORE
TAG: CORE.TEST.HEADER_PARSER.MAIN
DESCRIPTION: Baseline unit test for header parser metadata extraction
AUTHORITY: LeeWay-Standards
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

5WH:
WHAT = header-parser.test
WHY = Ensure parser reads TAG and REGION fields
WHO = LeeWay Standards
WHERE = src/core/header-parser.test.js
WHEN = 2026-04-21
HOW = Node test with fixed header sample input

CHAIN: Standards → Integrated → Runtime → Projections
LICENSE: PROPRIETARY
*/

import test from "node:test";
import assert from "node:assert/strict";
import { parseHeader } from "./header-parser.js";

test("parseHeader extracts tag and region", () => {
  const source = `
/**
 * LEEWAY_HEADER
 * TAG: CORE.TEST.HEADER.MAIN
 * REGION: CORE
 */
`;

  const result = parseHeader(source);
  assert.equal(result.tag, "CORE.TEST.HEADER.MAIN");
  assert.equal(result.region, "CORE");
});
