#
# LEEWAY HEADER — DO NOT REMOVE
#
# REGION: TEST
# TAG: CORE.SDK.TEST_ROUTER_AGENT.MAIN
#
# COLOR_ONION_HEX:
# NEON=#39FF14
# FLUO=#0DFF94
# PASTEL=#C7FFD8
#
# ICON_ASCII:
# family=lucide
# glyph=file
#
# 5WH:
# WHAT = test_router_agent module
# WHY = Part of TEST region
# WHO = LEEWAY Align Agent
# WHERE = voice\server\tests\test_router_agent.py
# WHEN = 2026
# HOW = Auto-aligned by LEEWAY align-agent
#
# AGENTS:
# ASSESS
# ALIGN
# AUDIT
#
# LICENSE:
# MIT
#

"""
tests/test_router_agent.py – Unit tests for RouterAgent (no external deps).
"""
import pytest

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from agent_core.router_agent import RouterAgent, RouteDecision


def make_router(offline=False):
    return RouterAgent(
        leeway_threshold=0.6,
        offline_mode=offline,
    )


class TestRouterAgentRules:
    def test_greeting_routes_local(self):
        r = make_router()
        decision = r.route("hello")
        assert decision.mode == "local"

    def test_thanks_routes_local(self):
        r = make_router()
        decision = r.route("thank you")
        assert decision.mode == "local"

    def test_stop_routes_local(self):
        r = make_router()
        decision = r.route("stop")
        assert decision.mode == "local"

    def test_code_routes_local_hive_mind(self):
        r = make_router()
        decision = r.route("write me a Python script that reads a CSV file")
        # Hive mind handles all routes locally
        assert decision.mode == "local"

    def test_explain_long_routes_local_hive_mind(self):
        r = make_router()
        decision = r.route("explain how transformer neural networks work in detail")
        # Hive mind handles all routes locally
        assert decision.mode == "local"

    def test_short_query_heuristic_local(self):
        r = make_router()
        decision = r.route("What is pi?")
        assert decision.mode == "local"

    def test_low_confidence_stt_routes_local(self):
        r = make_router()
        decision = r.route("mumble jumble something", low_confidence_stt=True)
        assert decision.mode == "local"
        assert decision.reason == "low_stt_confidence_clarify"

    def test_very_short_text_routes_local(self):
        r = make_router()
        decision = r.route("hi")
        assert decision.mode == "local"

    def test_empty_text_routes_local(self):
        r = make_router()
        decision = r.route("")
        assert decision.mode == "local"


class TestRouterAgentOfflineMode:
    def test_offline_forces_local_for_leeway_patterns(self):
        r = make_router(offline=True)
        # In offline mode even "heavy" queries must go local
        decision = r.route("write me a long essay about machine learning")
        assert decision.mode == "local"

    def test_offline_greeting_still_local(self):
        r = make_router(offline=True)
        decision = r.route("hello")
        assert decision.mode == "local"

    def test_offline_complex_still_local(self):
        r = make_router(offline=True)
        decision = r.route("what are the main differences between Rust and Go programming languages and which should I choose for systems programming in 2024")
        assert decision.mode == "local"


class TestRouteDecision:
    def test_decision_has_required_fields(self):
        r = make_router()
        d = r.route("hello there")
        assert isinstance(d, RouteDecision)
        assert d.mode in ("local", "leeway")
        assert isinstance(d.reason, str)
        assert 0.0 <= d.confidence <= 1.0

