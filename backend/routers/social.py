"""
Public endpoint to fetch social profile preview data (profile picture, display name,
followers count) from Instagram or TikTok by scraping publicly available OG meta tags.
No authentication required — used during influencer onboarding.
"""
import re
import requests as http_requests
from fastapi import APIRouter, HTTPException, Query
from typing import Optional

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


def _scrape_profile(platform: str, handle: str) -> dict:
    """
    Scrape all profile data from the public profile page in one HTTP request.
    Returns a dict with any subset of: profile_picture_url, display_name, bio, followers_count.
    """
    url = (
        f"https://www.instagram.com/{handle}/"
        if platform == "instagram"
        else f"https://www.tiktok.com/@{handle}"
    )

    result: dict = {}
    try:
        resp = http_requests.get(url, headers=_HEADERS, timeout=8, allow_redirects=True)
    except Exception:
        return result

    if resp.status_code not in (200, 304):
        return result

    html = resp.text

    # ── Profile picture (og:image) ──────────────────────────
    image = _extract_og(html, "image")
    if image and not image.endswith("default.jpg") and "default_profile" not in image:
        result["profile_picture_url"] = image

    # ── Display name (og:title) ─────────────────────────────
    # Instagram: "Username (@handle) • Instagram photos and videos"
    # TikTok:    "Username (@handle) | TikTok"
    title = _extract_og(html, "title")
    if title:
        name = re.sub(r"\s*\(@[^)]+\)\s*", "", title)
        name = re.sub(r"\s*[•·|]\s*(Instagram|TikTok).*$", "", name, flags=re.IGNORECASE).strip()
        if name and len(name) < 100:
            result["display_name"] = name

    # ── Followers ───────────────────────────────────────────
    description = _extract_og(html, "description") or ""

    if platform == "tiktok":
        m = re.search(r'"followerCount"\s*:\s*(\d+)', html)
        if m:
            result["followers_count"] = int(m.group(1))

    if "followers_count" not in result:
        m = re.search(r"([\d,]+(?:\.\d+)?[KMkm]?)\s+[Ff]ollowers", description)
        if not m:
            m = re.search(r"([\d,]+(?:\.\d+)?[KMkm]?)\s+[Ff]ollowers", html[:10000])
        if m:
            result["followers_count"] = _parse_followers(m.group(1))

    # ── Bio (best-effort from og:description) ───────────────
    # Instagram descriptions look like: "5K Followers, 200 Following, 45 Posts - bio text here"
    if description:
        bio_part = re.split(r"\s*-\s*", description, maxsplit=1)
        if len(bio_part) > 1 and not bio_part[1].startswith("See "):
            result["bio"] = bio_part[1].strip()

    return result


UNAVATAR_BASE = "https://unavatar.io"


def _unavatar_url(platform: str, handle: str) -> str:
    return f"{UNAVATAR_BASE}/{platform}/{handle}"


@router.get("/preview")
def social_preview(
    platform: str = Query(..., description="instagram or tiktok"),
    handle: str = Query(..., description="Username without @ prefix"),
):
    """
    Return social profile data for a given handle.
    Tries to scrape real data from the public profile page (og:image, og:title, followers).
    Falls back to unavatar.io for profile picture if scraping returns nothing.
    """
    handle = handle.strip().lstrip("@")
    if not handle:
        raise HTTPException(status_code=400, detail="Handle cannot be empty.")

    if platform not in ("instagram", "tiktok"):
        raise HTTPException(status_code=400, detail="Platform must be 'instagram' or 'tiktok'.")

    data = _scrape_profile(platform, handle)

    # Only return profile_picture_url if we actually scraped a real one.
    # Don't fall back to unavatar.io — it often returns a generic cartoon avatar
    # and misleads the user into thinking it's their real photo.
    scraped_pic = data.get("profile_picture_url")

    return {
        "platform": platform,
        "handle": handle,
        "profile_picture_url": scraped_pic,        # None if not found
        "display_name": data.get("display_name"),
        "bio": data.get("bio"),
        "followers_count": data.get("followers_count"),
        "followers_scraped": "followers_count" in data,
        "pic_scraped": scraped_pic is not None,
        "scraped": bool(data),
    }
