# LEEWAY HEADER - DO NOT REMOVE
#
# REGION: AI
# TAG: CORE.SDK.MAIN.MAIN
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
# WHAT = main module
# WHY = Part of AI region
# WHO = LEEWAY Align Agent
# WHERE = voice\server\main.py
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

"""
main.py – FastAPI server entry point for Agent Lee Voice Core.

Endpoints:
  GET  /           → health check JSON
  GET  /ws         → WebSocket audio/event channel (one per client)
  GET  /status     → server status JSON

WebSocket protocol: see websocket_protocol.py and docs/ARCHITECTURE.md
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import uuid
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from config import settings
from pipeline import VoicePipeline
from websocket_protocol import HelloEvent, make_error, make_state, AgentState

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("agentlee.server")

# ── Shared state (loaded once at startup) ────────────────────────────────────
_shared_stt = None
_shared_vad = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    logger.info("Agent Lee Voice Core starting…")
    settings.ensure_data_dir()
    logger.info(
        "Mode: %s | leeway: %s",
        "OFFLINE" if settings.offline_mode else "ONLINE",
        "enabled" if settings.is_leeway_available else "disabled",
    )
    yield
    logger.info("Agent Lee Voice Core shutting down.")



# ── App ───────────────────────────────────────────────────────────────────────
from fastapi import APIRouter

app = FastAPI(
    title="Agent Lee Voice Core",
    version="1.0.0",
    description="Production real-time voice AI server.",
    lifespan=lifespan,
)

# API versioning
api_v1 = APIRouter(prefix="/api/v1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static web client if dist/ directory exists
_CLIENT_DIST = os.path.join(os.path.dirname(__file__), "..", "client", "dist")
if os.path.isdir(_CLIENT_DIST):
    app.mount("/app", StaticFiles(directory=_CLIENT_DIST, html=True), name="client")



# ── REST endpoints (versioned) ────────────────────────────────────────────────
@api_v1.get("/health")
async def health() -> JSONResponse:
    return JSONResponse({
        "status": "ok",
        "service": "Agent Lee Voice Core",
        "version": "1.0.0",
        "offline_mode": settings.offline_mode,
        "leeway_available": settings.is_leeway_available,
    })

@api_v1.get("/status")
async def status() -> JSONResponse:
    return JSONResponse({
        "status": "ok",
        "offline_mode": settings.offline_mode,
        "leeway_available": settings.is_leeway_available,
        "whisper_model": settings.whisper_model,
        "tts_sample_rate": settings.tts_sample_rate,
    })

# Feature flag endpoint
import os
@api_v1.get("/feature-flags")
async def feature_flags() -> JSONResponse:
    # Example: set FEATURE_X=true in env to enable
    flags = {k: v for k, v in os.environ.items() if k.startswith("FEATURE_")}
    return JSONResponse(flags)

app.include_router(api_v1)


# ── WebSocket ─────────────────────────────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket) -> None:
    await ws.accept()
    session_id = str(uuid.uuid4())
    logger.info("Client connected: session=%s", session_id)

    # ── Send / receive helpers ─────────────────────────────────────────────
    async def send_json(data: Any) -> None:
        try:
            await ws.send_json(data)
        except Exception:
            pass

    async def send_bytes(data: bytes) -> None:
        try:
            await ws.send_bytes(data)
        except Exception:
            pass

    # ── Build pipeline ─────────────────────────────────────────────────────
    pipeline = VoicePipeline(
        settings=settings,
        send_json=send_json,
        send_bytes=send_bytes,
        session_id=session_id,
    )

    # Load models in background thread so WS doesn't stall
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, pipeline.start)

    await send_json(make_state(AgentState.LISTENING))
    logger.info("Pipeline ready for session=%s", session_id)

    try:
        while True:
            message = await ws.receive()

            if "bytes" in message and message["bytes"]:
                # Raw PCM audio frame
                await pipeline.process_audio_chunk(message["bytes"])

            elif "text" in message and message["text"]:
                raw = message["text"]
                try:
                    data = json.loads(raw)
                except json.JSONDecodeError:
                    await send_json(make_error("invalid_json", "Could not parse message."))
                    continue

                msg_type = data.get("type", "")

                if msg_type == "hello":
                    event = HelloEvent(**data)
                    logger.info(
                        "hello from client: caps=%s sr=%d",
                        event.capabilities, event.sample_rate,
                    )
                    await send_json({"type": "hello_ack", "session_id": session_id})

                elif msg_type == "interrupt":
                    await pipeline.handle_interrupt()

                elif msg_type == "text":
                    text = data.get("text", "").strip()
                    if text:
                        await pipeline.process_text_input(text)

                elif msg_type == "rtc_state":
                    pipeline.update_rtc_context(data.get("state", {}))

                elif msg_type == "audio":
                    # JSON audio metadata frame (binary data comes separately)
                    pass

                else:
                    logger.debug("Unknown message type: %s", msg_type)

    except WebSocketDisconnect:
        logger.info("Client disconnected: session=%s", session_id)
    except Exception as exc:
        logger.exception("Unexpected error in WS handler: %s", exc)
        try:
            await send_json(make_error("server_error", str(exc)))
        except Exception:
            pass
    finally:
        pipeline.stop()

