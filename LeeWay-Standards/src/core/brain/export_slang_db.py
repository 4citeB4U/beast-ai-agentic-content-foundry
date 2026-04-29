
"""
LEEWAY HEADER -- DO NOT REMOVE

REGION: DATA
TAG: CORE.SDK.EXPORT_SLANG_DB.MAIN

COLOR_ONION_HEX:
NEON=#39FF14
FLUO=#0DFF94
PASTEL=#C7FFD8

ICON_ASCII:
family=lucide
glyph=file

5WH:
WHAT = export_slang_db module
WHY = Part of DATA region
WHO = LEEWAY Align Agent
WHERE = brain\export_slang_db.py
WHEN = 2026
HOW = Auto-aligned by LEEWAY align-agent

AGENTS:
ASSESS
ALIGN
AUDIT

LICENSE:
MIT
"""

"""
Export brain/slang_lexicon.json → brain/slang.db (SQLite)
Run: python brain/export_slang_db.py
"""
import json, sqlite3, os

LEXICON_PATH = os.path.join(os.path.dirname(__file__), "slang_lexicon.json")
DB_PATH      = os.path.join(os.path.dirname(__file__), "slang.db")

with open(LEXICON_PATH, "r", encoding="utf-8") as f:
    data = json.load(f)

conn = sqlite3.connect(DB_PATH)
c = conn.cursor()
c.execute("DROP TABLE IF EXISTS slang")
c.execute("""
CREATE TABLE slang (
    term         TEXT PRIMARY KEY,
    canonical    TEXT,
    pos          TEXT,
    definition   TEXT,
    example      TEXT,
    agent_usage  TEXT,
    register     TEXT,
    region       TEXT,
    speaker      TEXT,
    sentiment    TEXT,
    offensive    INTEGER,
    first_seen   TEXT,
    source       TEXT,
    confidence   REAL,
    phonetic     TEXT
)
""")

for e in data:
    c.execute("INSERT OR REPLACE INTO slang VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", (
        e.get("slang"), e.get("canonical"), e.get("pos"),
        e.get("definition"), e.get("example"),
        e.get("agent_lee_usage", ""),
        e.get("register"), e.get("region"), e.get("speaker_profile"),
        e.get("sentiment"), 1 if e.get("offensive") else 0,
        e.get("first_seen"), e.get("source"),
        e.get("confidence"), e.get("phonetic"),
    ))

conn.commit()
conn.close()
count = len(data)
print(f"[slang-db] Exported {count} entries → {DB_PATH}")
