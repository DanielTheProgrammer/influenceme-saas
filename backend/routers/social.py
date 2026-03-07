"""
Public endpoint to fetch social profile preview data (profile picture + follower count)
from Instagram or TikTok by scraping publicly available OG meta tags.
No authentication required — used during influencer onboarding.
"""
import re
import requests as http_requests
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List

router = APIRouter(prefix="/social", tags=["social"])

# User-agent that Instagram/TikTok reliably serve OG tags to
_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}


def _parse_followers(raw: str) -> Optional[int]:
    """Parse '54.5K', '1.2M', '14,321' etc. into an integer."""
    raw = raw.replace(",", "").strip()
    try:
        if raw.upper().endswith("M"):
            return int(float(raw[:-1]) * 1_000_000)
        if raw.upper().endswith("K"):
            return int(float(raw[:-1]) * 1_000)
        return int(float(raw))
    except ValueError:
        return None


def _extract_og(html: str, property_name: str) -> Optional[str]:
    m = re.search(
        rf'<meta\s[^>]*property=["\']og:{property_name}["\']\s[^>]*content=["\'](.*?)["\']',
        html, re.IGNORECASE
    )
    if not m:
        m = re.search(
            rf'<meta\s[^>]*content=["\'](.*?)["\']\s[^>]*property=["\']og:{property_name}["\']',
            html, re.IGNORECASE
        )
    return m.group(1).strip() if m else None


UNAVATAR_BASE = "https://unavatar.io"


def _unavatar_url(platform: str, handle: str) -> str:
    """
    Returns a URL that resolves to the user's current profile picture.
    unavatar.io proxies social profile pictures without requiring API auth.
    """
    return f"{UNAVATAR_BASE}/{platform}/{handle}"


def _scrape_followers(platform: str, handle: str) -> Optional[int]:
    """
    Attempt to scrape follower count from public profile page.
    Returns None if blocked or unavailable (caller should fallback to manual entry).
    """
    if platform == "instagram":
        url = f"https://www.instagram.com/{handle}/"
    else:
        url = f"https://www.tiktok.com/@{handle}"

    try:
        resp = http_requests.get(url, headers=_HEADERS, timeout=8, allow_redirects=True)
    except Exception:
        return None

    if resp.status_code not in (200, 304):
        return None

    html = resp.text

    if platform == "instagram":
        description = _extract_og(html, "description") or ""
        m = re.search(r"([\d,]+(?:\.\d+)?[KMkm]?)\s+[Ff]ollowers", description)
        if m:
            return _parse_followers(m.group(1))
        m = re.search(r"([\d,]+(?:\.\d+)?[KMkm]?)\s+[Ff]ollowers", html[:10000])
        if m:
            return _parse_followers(m.group(1))

    elif platform == "tiktok":
        m = re.search(r'"followerCount"\s*:\s*(\d+)', html)
        if m:
            return int(m.group(1))
        description = _extract_og(html, "description") or ""
        m = re.search(r"([\d,]+(?:\.\d+)?[KMkm]?)\s+[Ff]ollowers", description)
        if m:
            return _parse_followers(m.group(1))

    return None


@router.get("/preview")
def social_preview(
    platform: str = Query(..., description="instagram or tiktok"),
    handle: str = Query(..., description="Username without @ prefix"),
):
    """
    Return social profile data for a given handle:
    - profile_picture_url: via unavatar.io (always works for public accounts)
    - followers_count: scraped from public profile page (may be None if blocked)

    Used during influencer onboarding to auto-fill profile fields.
    Stored profile_picture_url dynamically resolves to the current profile picture.
    """
    handle = handle.strip().lstrip("@")
    if not handle:
        raise HTTPException(status_code=400, detail="Handle cannot be empty.")

    if platform not in ("instagram", "tiktok"):
        raise HTTPException(status_code=400, detail="Platform must be 'instagram' or 'tiktok'.")

    profile_picture_url = _unavatar_url(platform, handle)
    followers_count = _scrape_followers(platform, handle)

    return {
        "platform": platform,
        "handle": handle,
        "profile_picture_url": profile_picture_url,
        "followers_count": followers_count,
        "followers_scraped": followers_count is not None,
    }


