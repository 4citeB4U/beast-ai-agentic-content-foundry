#
# LEEWAY HEADER — DO NOT REMOVE
#
# REGION: TEST
# TAG: CORE.SDK.TEST_PROSODY_AGENT.MAIN
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
# WHAT = test_prosody_agent module
# WHY = Part of TEST region
# WHO = LEEWAY Align Agent
# WHERE = voice\server\tests\test_prosody_agent.py
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
tests/test_prosody_agent.py – Unit tests for ProsodyAgent.
"""
import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from agent_core.prosody_agent import ProsodyAgent, ProsodyPlan


@pytest.fixture
def agent():
    return ProsodyAgent()


class TestProsodyAgentEmotion:
    def test_excited_exclamation(self, agent):
        plan = agent.plan("That's amazing!")
        assert plan.emotion == "excited"

    def test_calm_apology(self, agent):
        plan = agent.plan("I'm sorry for the confusion, I understand.")
        assert plan.emotion == "calm"

    def test_serious_warning(self, agent):
        plan = agent.plan("Warning: critical error detected.")
        assert plan.emotion == "serious"

    def test_neutral_default(self, agent):
        plan = agent.plan("The answer is 42.")
        assert plan.emotion == "neutral"


class TestProsodyAgentPace:
    def test_slow_for_step_by_step(self, agent):
        plan = agent.plan("Let me explain step by step.")
        assert plan.pace < 1.0

    def test_fast_for_quick(self, agent):
        plan = agent.plan("Here is a quick answer.")
        assert plan.pace > 1.0

    def test_default_pace(self, agent):
        plan = agent.plan("The sky is blue.")
        assert plan.pace == 1.0


class TestProsodyAgentleewayTags:
    def test_leeway_tags_override_heuristics(self, agent):
        plan = agent.plan(
            "The sky is blue!",
            leeway_tags={"emotion": "calm", "pace": 0.8, "pitch": 1.0, "volume": 1.2},
        )
        assert plan.emotion == "calm"
        assert plan.pace == 0.8
        assert plan.pitch == 1.0


class TestProsodyAgentEmphasis:
    def test_caps_words_emphasised(self, agent):
        plan = agent.plan("This is VERY important.")
        assert "VERY" in plan.emphasis_words

    def test_star_words_emphasised(self, agent):
        plan = agent.plan("This is *really* cool.")
        assert "really" in plan.emphasis_words


class TestProsodyAgentSSML:
    def test_to_ssml_returns_speak_tag(self, agent):
        plan = ProsodyPlan(pace=1.1, pitch=2.0)
        ssml = agent.to_ssml("Hello world.", plan)
        assert "<speak>" in ssml
        assert "</speak>" in ssml
        assert "prosody" in ssml

