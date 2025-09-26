"""FastAPI application that exposes the academic calendar API."""

from __future__ import annotations

import asyncio
import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from agent.check_calendar import main as run_calendar_check
from agent.extract_calendar import get_calendar_payload

logger = logging.getLogger(__name__)

app = FastAPI(title="YTÜ Akademik Takvim API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


@app.get("/api/takvim")
async def oku_takvim():
    """Return structured academic calendar entries for 2025-2026."""
    try:
        return get_calendar_payload()
    except FileNotFoundError:
        logger.info("Calendar data missing, triggering download.")
        await asyncio.to_thread(run_calendar_check)
        try:
            return get_calendar_payload()
        except FileNotFoundError as error:
            raise HTTPException(status_code=503, detail="Calendar data unavailable.") from error


@app.get("/startup")
async def startup_status() -> dict[str, str]:
    """Expose an endpoint to show that the service is alive."""
    return {"status": "ok", "detail": "Service is running. Use /api/takvim."}


@app.get("/")
async def root() -> dict[str, str]:
    """Provide a simple landing response for the service root."""
    return {"message": "Use /api/takvim to fetch the academic calendar."}


async def schedule_calendar_check() -> None:
    """Run the calendar checker in a background thread."""

    async def runner() -> None:
        try:
            await asyncio.to_thread(run_calendar_check)
        except Exception:  # pylint: disable=broad-except
            logger.exception("Calendar check failed during startup.")

    asyncio.create_task(runner())


@app.on_event("startup")
async def on_startup() -> None:
    """Kick off the calendar check when the application starts."""
    await schedule_calendar_check()
