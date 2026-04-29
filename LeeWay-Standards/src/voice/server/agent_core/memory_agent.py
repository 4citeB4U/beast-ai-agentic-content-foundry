#
# LEEWAY HEADER — DO NOT REMOVE
#
# REGION: CORE
# TAG: CORE.SDK.MEMORY_AGENT.MAIN
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
# WHAT = memory_agent module
# WHY = Part of CORE region
# WHO = LEEWAY Align Agent
# WHERE = voice\server\agent_core\memory_agent.py
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
memory_agent.py – Local conversation memory using SQLite.

Provides:
  remember(key, value, session_id)  – store a fact
  retrieve(query, session_id)       – fetch relevant facts
  add_turn(role, content, session_id)
  get_recent_turns(n, session_id)   – last n turns for context injection
  get_context_snippet(query, session_id, max_tokens) – curated context string

Data lives in a local SQLite file (default: ./data/memory.db).
"""
from __future__ import annotations

import json
import logging
import sqlite3
import time
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

_SCHEMA = """
CREATE TABLE IF NOT EXISTS facts (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    session   TEXT    NOT NULL,
    key       TEXT    NOT NULL,
    value     TEXT    NOT NULL,
    ts        REAL    NOT NULL
);

CREATE TABLE IF NOT EXISTS turns (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    session   TEXT    NOT NULL,
    role      TEXT    NOT NULL,  -- 'user' | 'assistant'
    content   TEXT    NOT NULL,
    ts        REAL    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_facts_session ON facts(session);
CREATE INDEX IF NOT EXISTS idx_turns_session ON turns(session, ts);
"""


class MemoryAgent:
    """Persistent local memory store backed by SQLite."""

    def __init__(self, db_path: str = "./data/memory.db") -> None:
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._conn: Optional[sqlite3.Connection] = None

    # ── Lifecycle ─────────────────────────────────────────────────────────────

    def load(self) -> None:
        self._conn = sqlite3.connect(str(self.db_path), check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._conn.executescript(_SCHEMA)
        self._conn.commit()
        logger.info("MemoryAgent: SQLite DB at %s", self.db_path)

    def _db(self) -> sqlite3.Connection:
        if self._conn is None:
            self.load()
        return self._conn  # type: ignore[return-value]

    # ── Facts ─────────────────────────────────────────────────────────────────

    def remember(self, key: str, value: str, session_id: str = "default") -> None:
        """Store or update a named fact."""
        db = self._db()
        # Upsert by key within session
        db.execute(
            "DELETE FROM facts WHERE session=? AND key=?", (session_id, key)
        )
        db.execute(
            "INSERT INTO facts (session, key, value, ts) VALUES (?,?,?,?)",
            (session_id, key, value, time.time()),
        )
        db.commit()

    def retrieve(self, query: str = "", session_id: str = "default") -> dict[str, str]:
        """
        Retrieve all stored facts for the session.
        In a future version this would do semantic search; for MVP returns all.
        """
        rows = self._db().execute(
            "SELECT key, value FROM facts WHERE session=? ORDER BY ts DESC",
            (session_id,),
        ).fetchall()
        return {row["key"]: row["value"] for row in rows}

    # ── Turns ─────────────────────────────────────────────────────────────────

    def add_turn(
        self, role: str, content: str, session_id: str = "default"
    ) -> None:
        """Append a conversation turn."""
        self._db().execute(
            "INSERT INTO turns (session, role, content, ts) VALUES (?,?,?,?)",
            (session_id, role, content, time.time()),
        )
        self._db().commit()

    def get_recent_turns(
        self, n: int = 6, session_id: str = "default"
    ) -> list[dict[str, str]]:
        """Return the last n turns as list of {role, content} dicts."""
        rows = self._db().execute(
            "SELECT role, content FROM turns WHERE session=? ORDER BY ts DESC LIMIT ?",
            (session_id, n),
        ).fetchall()
        return [{"role": r["role"], "content": r["content"]} for r in reversed(rows)]

    # ── Context injection ─────────────────────────────────────────────────────

    def get_context_snippet(
        self,
        query: str = "",
        session_id: str = "default",
        max_tokens: int = 512,
    ) -> str:
        """
        Build a compact context string for injection into the LLM prompt.
        Includes recent facts + recent turns.  Truncated to ~max_tokens.
        """
        facts = self.retrieve(query, session_id)
        turns = self.get_recent_turns(4, session_id)

        lines: list[str] = []
        if facts:
            lines.append("Known facts:")
            for k, v in facts.items():
                lines.append(f"  {k}: {v}")
        if turns:
            lines.append("Recent conversation:")
            for t in turns:
                lines.append(f"  {t['role'].capitalize()}: {t['content']}")

        snippet = "\n".join(lines)
        # Rough token estimate: 4 chars ≈ 1 token
        if len(snippet) > max_tokens * 4:
            snippet = snippet[: max_tokens * 4]
        return snippet

    def close(self) -> None:
        if self._conn:
            self._conn.close()
            self._conn = None
