from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from agent.extract_calendar import get_calendar_payload

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
    return get_calendar_payload()
