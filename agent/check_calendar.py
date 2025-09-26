"""Monitor YTU academic calendar link and download updates."""
from __future__ import annotations

import datetime as _dt
import json
import unicodedata
from pathlib import Path
from typing import Any, Dict
from urllib.parse import urljoin, urlsplit

import requests
from bs4 import BeautifulSoup

PAGE_URL = "https://ogi.yildiz.edu.tr/ogi/3"
TARGET_KEYWORDS = ("ytu", "2025-2026", "lisans akademik takvimi")
STATE_PATH = Path(__file__).with_name("state.json")
DOWNLOAD_DIR = Path(__file__).with_name("downloads")

TRANSLATION_TABLE = str.maketrans(
    {
        "ı": "i",
        "İ": "i",
        "ğ": "g",
        "Ğ": "g",
        "ş": "s",
        "Ş": "s",
        "ç": "c",
        "Ç": "c",
        "ö": "o",
        "Ö": "o",
        "ü": "u",
        "Ü": "u",
    }
)


def normalize(text: str) -> str:
    """Return a sanitized string for consistent keyword matching."""
    text = text.translate(TRANSLATION_TABLE)
    decomposed = unicodedata.normalize("NFKD", text)
    stripped = "".join(ch for ch in decomposed if not unicodedata.combining(ch))
    ascii_only = stripped.encode("ascii", "ignore").decode("ascii")
    return " ".join(ascii_only.lower().split())


def fetch_latest_link() -> str:
    """Fetch the calendar page and return the absolute URL of the target link."""
    response = requests.get(PAGE_URL, timeout=30)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")

    for anchor in soup.find_all("a", href=True):
        anchor_text = normalize(anchor.get_text(strip=True))
        if all(keyword in anchor_text for keyword in TARGET_KEYWORDS):
            return urljoin(PAGE_URL, anchor["href"])

    raise RuntimeError("Expected calendar link not found on page.")


def load_state() -> Dict[str, Any]:
    if STATE_PATH.exists():
        with STATE_PATH.open("r", encoding="utf-8") as handle:
            return json.load(handle)
    return {}


def save_state(state: Dict[str, Any]) -> None:
    with STATE_PATH.open("w", encoding="utf-8") as handle:
        json.dump(state, handle, indent=2, ensure_ascii=False)


def download_file(url: str) -> Path:
    DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)

    response = requests.get(url, timeout=60)
    response.raise_for_status()

    filename = Path(urlsplit(url).path).name or "calendar.xlsx"
    timestamp = _dt.datetime.now(_dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    destination = DOWNLOAD_DIR / f"{timestamp}_{filename}"

    with destination.open("wb") as handle:
        handle.write(response.content)

    return destination


def main() -> None:
    state = load_state()
    try:
        latest_url = fetch_latest_link()
    except Exception as error:  # pylint: disable=broad-except
        print(f"Failed to fetch calendar link: {error}")
        return

    if state.get("last_url") == latest_url:
        print("No update detected.")
        return

    print("New calendar detected, downloading...")
    try:
        saved_path = download_file(latest_url)
    except Exception as error:  # pylint: disable=broad-except
        print(f"Download failed: {error}")
        return

    state.update(
        {
            "last_url": latest_url,
            "downloaded_at": _dt.datetime.now(_dt.timezone.utc).isoformat(),
            "saved_filename": saved_path.name,
        }
    )
    save_state(state)
    print(f"Saved new file to {saved_path}")


if __name__ == "__main__":
    main()
