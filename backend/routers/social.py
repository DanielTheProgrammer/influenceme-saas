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


def _get_viral_video_url(platform: str, handle: str) -> Optional[str]:
    """
    Use yt-dlp to extract the most-viewed video CDN URL from a TikTok or Instagram profile.

    Strategy:
      1. Flat-extract the profile playlist to get video IDs + view counts (fast, 1 request).
      2. Sort by view_count, pick the top video.
      3. Full-extract just that one video to obtain the signed CDN mp4 URL.

    Notes:
      - TikTok CDN URLs are signed and expire in ~24h; refresh via re-sync.
      - Returns None on any failure so callers can degrade gracefully.
      - Requires yt-dlp in requirements.txt.
    """
    try:
        import yt_dlp  # lazy import — not available in all envs
    except ImportError:
        print("[viral_video] yt-dlp not installed")
        return None

    handle = handle.strip().lstrip("@")

    if platform == "tiktok":
        profile_url = f"https://www.tiktok.com/@{handle}"
    elif platform == "instagram":
        # Reels endpoint returns more videos than the main profile page
        profile_url = f"https://www.instagram.com/{handle}/reels/"
    else:
        return None

    # ── Step 1: flat extraction — quick, gets view counts ──────────────────
    try:
        flat_opts = {
            "quiet": True,
            "no_warnings": True,
            "skip_download": True,
            "extract_flat": True,
            "playlistend": 15,
        }
        with yt_dlp.YoutubeDL(flat_opts) as ydl:
            flat_info = ydl.extract_info(profile_url, download=False)

        if not flat_info or not flat_info.get("entries"):
            return None

        entries: List[dict] = [e for e in flat_info["entries"] if e and e.get("url")]
        if not entries:
            return None

        # Sort by view count — TikTok includes this in flat info
        entries.sort(key=lambda e: e.get("view_count") or 0, reverse=True)
        best_url = entries[0]["url"]

    except Exception as exc:
        print(f"[viral_video] flat extract failed for {platform}/{handle}: {exc}")
        return None

    # ── Step 2: full extraction for the top video → CDN mp4 URL ───────────
    try:
        video_opts = {
            "quiet": True,
            "no_warnings": True,
            "skip_download": True,
            "format": "mp4/best[ext=mp4]/best",
        }
        with yt_dlp.YoutubeDL(video_opts) as ydl:
            video_info = ydl.extract_info(best_url, download=False)

        if not video_info:
            return None

        # Direct URL shortcut (some extractors set this at top level)
        if video_info.get("url"):
            return video_info["url"]

        # Select best mp4 from formats list
        formats = video_info.get("formats") or []
        mp4_formats = [
            f for f in formats
            if f.get("ext") == "mp4" and f.get("url") and f.get("vcodec") != "none"
        ]
        if mp4_formats:
            mp4_formats.sort(key=lambda f: f.get("height") or 0, reverse=True)
            return mp4_formats[0]["url"]

        return None

    except Exception as exc:
        print(f"[viral_video] video extract failed for {best_url}: {exc}")
        return None


@router.get("/viral-video")
def get_viral_video(
    platform: str = Query(..., description="instagram or tiktok"),
    handle: str = Query(..., description="Username without @ prefix"),
):
    """
    Detect the most viral (highest view count) video from a TikTok or Instagram profile.
    Returns a direct signed CDN mp4 URL usable for 24–48 h (refresh via re-sync).

    This call takes 5–20 s depending on platform response times.
    The frontend calls this separately from /social/preview so the fast fields
    (profile picture, followers) appear immediately while video detection runs.
    """
    handle = handle.strip().lstrip("@")
    if not handle:
        raise HTTPException(status_code=400, detail="Handle cannot be empty.")
    if platform not in ("instagram", "tiktok"):
        raise HTTPException(status_code=400, detail="Platform must be 'instagram' or 'tiktok'.")

    viral_video_url = _get_viral_video_url(platform, handle)

    return {
        "platform": platform,
        "handle": handle,
        "viral_video_url": viral_video_url,
        "detected": viral_video_url is not None,
    }


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
