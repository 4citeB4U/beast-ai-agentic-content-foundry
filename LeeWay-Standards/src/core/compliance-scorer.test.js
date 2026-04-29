/*
LEEWAY HEADER — DO NOT REMOVE

REGION: CORE
TAG: CORE.TEST.COMPLIANCE_SCORER.MAIN
DESCRIPTION: Baseline unit test for compliance score normalization
AUTHORITY: LeeWay-Standards
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

5WH:
WHAT = compliance-scorer.test
WHY = Ensure scorer emits bounded numeric score values
WHO = LeeWay Standards
WHERE = src/core/compliance-scorer.test.js
WHEN = 2026-04-21
HOW = Node test for score type and value range

CHAIN: Standards → Integrated → Runtime → Projections
LICENSE: PROPRIETARY
*/

import test from "node:test";
import assert from "node:assert/strict";
import { scoreCompliance } from "./compliance-scorer.js";

test("scoreCompliance returns numeric score", () => {
	const result = scoreCompliance({
		hasHeader: true,
		hasTag: true,
		hasRegion: true,
		hasDiscoveryPipeline: true,
	});

	assert.equal(typeof result.score, "number");
	assert.ok(result.score >= 0 && result.score <= 100);
});