#
# LEEWAY HEADER — DO NOT REMOVE
#
# REGION: CORE
# TAG: CORE.SDK.WEBSOCKET_PROTOCOL.MAIN
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
# WHAT = websocket_protocol module
# WHY = Part of CORE region
# WHO = LEEWAY Align Agent
# WHERE = voice\server\websocket_protocol.py
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
websocket_protocol.py – Typed event models for the Agent Lee WebSocket protocol.

Client → Server events:
  hello        Client capabilities handshake
  audio        Binary audio frames (raw PCM 16-bit LE, 16 kHz mono)
  interrupt    User requests barge-in / stop AI speech
  text         Typed text input (fallback)

Server → Client events:
  state              listening | thinking | speaking
  partial_transcript Interim STT result
  final_transcript   Confirmed STT result
  partial_response_text  Streaming LLM token(s)
  final_response_text    Full LLM response
  audio_out          Binary audio chunks (PCM, same sample rate as TTS config)
  error              Error message
"""
from __future__ import annotations

from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field


# ── Enumerations ──────────────────────────────────────────────────────────────

class AgentState(str, Enum):
    LISTENING = "listening"
    THINKING = "thinking"
    SPEAKING = "speaking"
    IDLE = "idle"


class RouteMode(str, Enum):
    LOCAL = "local"
    leeway = "leeway"


# ── Client → Server ──────────────────────────────────────────────────────────

class HelloEvent(BaseModel):
    type: Literal["hello"] = "hello"
    version: str = "1"
    capabilities: list[str] = Field(default_factory=list)
    sample_rate: int = 16000
    channels: int = 1


class AudioMetadata(BaseModel):
    sample_rate: int = 16000
    channels: int = 1
    encoding: str = "pcm_s16le"
    chunk_index: int = 0


class InterruptEvent(BaseModel):
    type: Literal["interrupt"] = "interrupt"


class TextEvent(BaseModel):
    type: Literal["text"] = "text"
    text: str


# ── Server → Client ──────────────────────────────────────────────────────────

class StateEvent(BaseModel):
    type: Literal["state"] = "state"
    state: AgentState


class PartialTranscriptEvent(BaseModel):
    type: Literal["partial_transcript"] = "partial_transcript"
    text: str
    confidence: float = 1.0


class FinalTranscriptEvent(BaseModel):
    type: Literal["final_transcript"] = "final_transcript"
    text: str
    confidence: float = 1.0


class PartialResponseTextEvent(BaseModel):
    type: Literal["partial_response_text"] = "partial_response_text"
    text: str
    token_index: int = 0


class FinalResponseTextEvent(BaseModel):
    type: Literal["final_response_text"] = "final_response_text"
    text: str
    route: RouteMode = RouteMode.LOCAL


class AudioOutMetadata(BaseModel):
    sample_rate: int = 22050
    channels: int = 1
    encoding: str = "pcm_s16le"
    chunk_index: int = 0
    is_last: bool = False


class ErrorEvent(BaseModel):
    type: Literal["error"] = "error"
    code: str
    message: str


# ── Helper ────────────────────────────────────────────────────────────────────

def make_state(state: AgentState) -> dict[str, Any]:
    return StateEvent(state=state).model_dump()


def make_partial_transcript(text: str, confidence: float = 1.0) -> dict[str, Any]:
    return PartialTranscriptEvent(text=text, confidence=confidence).model_dump()


def make_final_transcript(text: str, confidence: float = 1.0) -> dict[str, Any]:
    return FinalTranscriptEvent(text=text, confidence=confidence).model_dump()


def make_partial_response(text: str, idx: int = 0) -> dict[str, Any]:
    return PartialResponseTextEvent(text=text, token_index=idx).model_dump()


def make_final_response(text: str, route: RouteMode = RouteMode.LOCAL) -> dict[str, Any]:
    return FinalResponseTextEvent(text=text, route=route).model_dump()


def make_error(code: str, message: str) -> dict[str, Any]:
    return ErrorEvent(code=code, message=message).model_dump()

