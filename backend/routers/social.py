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


import os

# Videos are downloaded to /tmp so they're served from our own domain (no CORS issues).
# Files persist as long as the Vercel function instance is warm; the background thread
# re-downloads them on each cold start.
_VIDEOS_DIR = "/tmp/viral_videos"


def _video_file_path(platform: str, handle: str) -> str:
    safe = handle.strip().lstrip("@").replace("/", "_")
    return os.path.join(_VIDEOS_DIR, f"{platform}_{safe}.mp4")


def _get_backend_url() -> str:
    vercel = os.getenv("VERCEL_URL")
    return f"https://{vercel}" if vercel else "http://localhost:8000"


def _pick_most_viral_video_url(platform: str, handle: str) -> Optional[str]:
    """Flat-extract profile → sort by view_count → return URL of top video page."""
    try:
        import yt_dlp
    except ImportError:
        return None

    if platform == "tiktok":
        urls_to_try = [f"https://www.tiktok.com/@{handle}"]
    elif platform == "instagram":
        urls_to_try = [f"https://www.instagram.com/{handle}/reels/"]
    else:
        return None

    # For TikTok, also try Instagram reels as fallback (Instagram yt-dlp extraction
    # is sometimes more reliable for accounts with public reels)
    if platform == "tiktok":
        urls_to_try.append(f"https://www.instagram.com/{handle}/reels/")

    for profile_url in urls_to_try:
        try:
            with yt_dlp.YoutubeDL({"quiet": True, "no_warnings": True, "skip_download": True,
                                    "extract_flat": True, "playlistend": 15}) as ydl:
                flat = ydl.extract_info(profile_url, download=False)
            entries: List[dict] = [e for e in (flat.get("entries") or []) if e and e.get("url")]
            if entries:
                entries.sort(key=lambda e: e.get("view_count") or 0, reverse=True)
                return entries[0]["url"]
        except Exception:
            continue

    return None


def download_viral_video(platform: str, handle: str) -> Optional[str]:
    """
    Download the most-viewed video from a TikTok/Instagram profile to local disk.

    Returns the backend URL at which the file will be served
    (e.g. https://backend.vercel.app/social/video-file/tiktok/mayaleex3),
    or None on failure.

    Storing videos locally avoids TikTok CDN CORS blocks and the ~5-minute
    expiry on signed CDN URLs.  Files survive as long as the Vercel function
    instance is warm; the startup background thread re-downloads on cold start.
    """
    try:
        import yt_dlp
    except ImportError:
        print("[viral_video] yt-dlp not installed")
        return None

    handle = handle.strip().lstrip("@")
    best_video_url = _pick_most_viral_video_url(platform, handle)
    if not best_video_url:
        return None

    os.makedirs(_VIDEOS_DIR, exist_ok=True)
    out_path = _video_file_path(platform, handle)

    try:
        ydl_opts = {
            "quiet": True,
            "no_warnings": True,
            # Smallest combined mp4 — keeps files under ~10 MB
            "format": "worst[ext=mp4]/worst/mp4",
            "outtmpl": out_path,
            "max_filesize": 30 * 1024 * 1024,  # 30 MB hard cap
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([best_video_url])
    except Exception as exc:
        print(f"[viral_video] download failed for {platform}/{handle}: {exc}")
        return None

    if not os.path.exists(out_path) or os.path.getsize(out_path) == 0:
        return None

    safe = handle.replace("/", "_")
    return f"{_get_backend_url()}/social/video-file/{platform}/{safe}"


# Keep the old name as an alias so main.py's background thread still works
_get_viral_video_url = download_viral_video


@router.get("/video-file/{platform}/{handle}")
def serve_video_file(platform: str, handle: str):
    """Serve a previously-downloaded viral video from local disk."""
    path = _video_file_path(platform, handle)
    if not os.path.exists(path) or os.path.getsize(path) == 0:
        raise HTTPException(status_code=404, detail="Video not yet ready. Try again shortly.")
    from fastapi.responses import FileResponse
    return FileResponse(
        path,
        media_type="video/mp4",
        headers={"Cache-Control": "public, max-age=7200", "Accept-Ranges": "bytes"},
    )


@router.get("/viral-video")
def get_viral_video(
    platform: str = Query(..., description="instagram or tiktok"),
    handle: str = Query(..., description="Username without @ prefix"),
):
    """
    Download the most viral video for a handle to local disk and return the
    backend URL at which it will be served.  The video file is served from
    /social/video-file/{platform}/{handle} — same domain as the API — so there
    are no CORS issues when the browser loads it in a <video> tag.
    """
    handle = handle.strip().lstrip("@")
    if not handle:
        raise HTTPException(status_code=400, detail="Handle cannot be empty.")
    if platform not in ("instagram", "tiktok"):
        raise HTTPException(status_code=400, detail="Platform must be 'instagram' or 'tiktok'.")

    video_url = download_viral_video(platform, handle)

    return {
        "platform": platform,
        "handle": handle,
        "viral_video_url": video_url,
        "detected": video_url is not None,
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


