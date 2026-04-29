/*
LEEWAY HEADER — DO NOT REMOVE

REGION: CORE
TAG: CORE.TEST.REGION_CLASSIFIER.MAIN
DESCRIPTION: Baseline unit test for region classifier mapping
AUTHORITY: LeeWay-Standards
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

5WH:
WHAT = region-classifier.test
WHY = Ensure UI tag namespaces map to expected region labels
WHO = LeeWay Standards
WHERE = src/core/region-classifier.test.js
WHEN = 2026-04-21
HOW = Node test with deterministic input assertion

CHAIN: Standards → Integrated → Runtime → Projections
LICENSE: PROPRIETARY
*/

import test from "node:test";
import assert from "node:assert/strict";
import { classifyRegion } from "./region-classifier.js";

test("classifyRegion maps UI tags correctly", () => {
	assert.equal(classifyRegion("UI.XR.CONSTRUCT.VIEW"), "UI");
});