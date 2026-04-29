#
# LEEWAY HEADER — DO NOT REMOVE
#
# REGION: TEST
# TAG: CORE.SDK.TEST_MEMORY_AGENT.MAIN
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
# WHAT = test_memory_agent module
# WHY = Part of TEST region
# WHO = LEEWAY Align Agent
# WHERE = voice\server\tests\test_memory_agent.py
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
tests/test_memory_agent.py – Unit tests for MemoryAgent.
"""
import sys
import os
import tempfile
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from agent_core.memory_agent import MemoryAgent


@pytest.fixture
def mem(tmp_path):
    db_path = str(tmp_path / "test_memory.db")
    agent = MemoryAgent(db_path=db_path)
    agent.load()
    yield agent
    agent.close()


class TestMemoryAgentFacts:
    def test_remember_and_retrieve(self, mem):
        mem.remember("name", "Alice", session_id="s1")
        facts = mem.retrieve(session_id="s1")
        assert facts["name"] == "Alice"

    def test_remember_overwrites_same_key(self, mem):
        mem.remember("color", "blue", session_id="s1")
        mem.remember("color", "red", session_id="s1")
        facts = mem.retrieve(session_id="s1")
        assert facts["color"] == "red"

    def test_different_sessions_isolated(self, mem):
        mem.remember("key", "val1", session_id="s1")
        mem.remember("key", "val2", session_id="s2")
        assert mem.retrieve(session_id="s1")["key"] == "val1"
        assert mem.retrieve(session_id="s2")["key"] == "val2"

    def test_retrieve_empty_returns_empty_dict(self, mem):
        assert mem.retrieve(session_id="nonexistent") == {}


class TestMemoryAgentTurns:
    def test_add_and_get_turns(self, mem):
        mem.add_turn("user", "Hello", session_id="s1")
        mem.add_turn("assistant", "Hi there", session_id="s1")
        turns = mem.get_recent_turns(n=10, session_id="s1")
        assert len(turns) == 2
        assert turns[0]["role"] == "user"
        assert turns[1]["role"] == "assistant"

    def test_get_recent_turns_limit(self, mem):
        for i in range(10):
            mem.add_turn("user", f"message {i}", session_id="s1")
        turns = mem.get_recent_turns(n=3, session_id="s1")
        assert len(turns) == 3

    def test_turns_are_ordered_oldest_first(self, mem):
        mem.add_turn("user", "first", session_id="s1")
        mem.add_turn("assistant", "second", session_id="s1")
        turns = mem.get_recent_turns(n=10, session_id="s1")
        assert turns[0]["content"] == "first"
        assert turns[1]["content"] == "second"


class TestMemoryAgentContextSnippet:
    def test_context_snippet_not_empty_after_facts(self, mem):
        mem.remember("location", "New York", session_id="s1")
        mem.add_turn("user", "What is the weather?", session_id="s1")
        snippet = mem.get_context_snippet(session_id="s1")
        assert "New York" in snippet or "location" in snippet

    def test_context_snippet_truncated(self, mem):
        for i in range(100):
            mem.remember(f"key_{i}", "x" * 50, session_id="s1")
        snippet = mem.get_context_snippet(session_id="s1", max_tokens=10)
        assert len(snippet) <= 10 * 4 + 10  # some tolerance
