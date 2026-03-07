#!/usr/bin/env python3
"""
Viral video refresh script — runs every 2 weeks via GitHub Actions.

For each influencer with a TikTok or Instagram handle:
  1. Uses yt-dlp to find their most-viewed public video
  2. Downloads it (capped at 50 MB, max 720p)
  3. Uploads to Supabase Storage bucket "viral-videos"
  4. Updates influencer_profiles.viral_video_url in the DB

Required environment variables:
  DATABASE_URL              - PostgreSQL connection string
  SUPABASE_URL              - e.g. https://qaykvqiytuaxcecfmpgf.supabase.co
  SUPABASE_SERVICE_ROLE_KEY - from Supabase dashboard → Settings → API
"""

import os
import sys
import tempfile
import time
from typing import Optional


# ---------------------------------------------------------------------------
# yt-dlp helpers
# ---------------------------------------------------------------------------

def _find_most_viral_url(platform: str, handle: str) -> Optional[str]:
    """
    Flat-extract the profile page, sort by view_count, return the URL of
    the most-viewed video.  Returns None on any failure.
    """
    try:
        import yt_dlp
    except ImportError:
        print("  [yt-dlp] not installed — run: pip install yt-dlp")
        return None

    if platform == "tiktok":
        profile_url = f"https://www.tiktok.com/@{handle}"
    elif platform == "instagram":
        profile_url = f"https://www.instagram.com/{handle}/reels/"
    else:
        return None

    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "extract_flat": True,
        "playlistend": 20,
        # Rotate user-agent to reduce bot detection
        "http_headers": {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            )
        },
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            flat = ydl.extract_info(profile_url, download=False)

        entries = [e for e in (flat.get("entries") or []) if e and e.get("url")]
        if not entries:
            print(f"  [yt-dlp] No videos found for {platform}/@{handle}")
            return None

        entries.sort(key=lambda e: e.get("view_count") or 0, reverse=True)
        top = entries[0]
        views = top.get("view_count") or 0
        print(f"  [yt-dlp] Most viral: {top['url'][:60]}... ({views:,} views)")
        return top["url"]

    except Exception as exc:
        print(f"  [yt-dlp] Extract failed for {platform}/@{handle}: {exc}")
        return None


def _download_video(video_page_url: str, output_path: str) -> bool:
    """
    Download the best available ≤720p MP4 to output_path.
    Returns True on success.
    """
    try:
        import yt_dlp
    except ImportError:
        return False

    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        # Prefer a single MP4 file ≤720p to keep sizes reasonable
        "format": (
            "bestvideo[ext=mp4][height<=720]+bestaudio[ext=m4a]"
            "/best[ext=mp4][height<=720]"
            "/best[height<=720]"
            "/best"
        ),
        "outtmpl": output_path,
        "max_filesize": 50 * 1024 * 1024,  # 50 MB hard cap
        "merge_output_format": "mp4",
        "http_headers": {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            )
        },
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([video_page_url])

        # yt-dlp may add an extension if output_path has no extension — check both
        if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
            return True
        # Check with .mp4 appended
        if os.path.exists(output_path + ".mp4") and os.path.getsize(output_path + ".mp4") > 0:
            os.rename(output_path + ".mp4", output_path)
            return True
        return False

    except Exception as exc:
        print(f"  [yt-dlp] Download failed: {exc}")
        return False


# ---------------------------------------------------------------------------
# Supabase Storage upload
# ---------------------------------------------------------------------------

def _upload_to_supabase(file_path: str, storage_name: str) -> Optional[str]:
    """
    Upload file_path to the "viral-videos" bucket in Supabase Storage.
    Returns the public CDN URL, or None on failure.
    """
    supabase_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

    if not supabase_url or not service_key:
        print("  [storage] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set")
        return None

    bucket = "viral-videos"
    upload_url = f"{supabase_url}/storage/v1/object/{bucket}/{storage_name}"

    try:
        import requests as req

        with open(file_path, "rb") as fh:
            data = fh.read()

        resp = req.put(
            upload_url,
            data=data,
            headers={
                "Authorization": f"Bearer {service_key}",
                "Content-Type": "video/mp4",
                "x-upsert": "true",
            },
            timeout=120,
        )

        if resp.status_code in (200, 201):
            public_url = f"{supabase_url}/storage/v1/object/public/{bucket}/{storage_name}"
            return public_url
        else:
            print(f"  [storage] Upload failed: {resp.status_code} — {resp.text[:300]}")
            return None

    except Exception as exc:
        print(f"  [storage] Upload error: {exc}")
        return None


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    try:
        import psycopg2
    except ImportError:
        print("ERROR: psycopg2 not installed — run: pip install psycopg2-binary")
        sys.exit(1)

    db_url = os.environ.get("DATABASE_URL", "")
    if not db_url:
        print("ERROR: DATABASE_URL not set")
        sys.exit(1)

    # Normalize asyncpg/asyncio prefixes — psycopg2 needs plain postgresql://
    db_url = (
        db_url
        .replace("postgresql+asyncpg://", "postgresql://")
        .replace("postgres+asyncpg://", "postgresql://")
    )

    conn = psycopg2.connect(db_url)
    conn.autocommit = False
    cur = conn.cursor()

    cur.execute("""
        SELECT id, display_name, tiktok_handle, instagram_handle
        FROM influencer_profiles
        WHERE tiktok_handle IS NOT NULL OR instagram_handle IS NOT NULL
        ORDER BY id
    """)
    influencers = cur.fetchall()

    print(f"Refreshing viral videos for {len(influencers)} influencer(s).\n")
    updated = 0
    failed = 0

    for inf_id, display_name, tiktok, instagram in influencers:
        platform = "tiktok" if tiktok else "instagram"
        handle = (tiktok or instagram).strip().lstrip("@")

        print(f"[{inf_id}] {display_name} — {platform}/@{handle}")

        # 1. Find most viral video URL
        video_page_url = _find_most_viral_url(platform, handle)
        if not video_page_url:
            print("  Skipped (no video found)\n")
            failed += 1
            continue

        # 2. Download to a temp file
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            ok = _download_video(video_page_url, tmp_path)
            if not ok:
                print("  Skipped (download failed)\n")
                failed += 1
                continue

            size_mb = os.path.getsize(tmp_path) / 1_048_576
            print(f"  Downloaded {size_mb:.1f} MB")

            # 3. Trim to first 15 seconds using FFmpeg (if available)
            trimmed_path = tmp_path + "_trimmed.mp4"
            try:
                import subprocess
                result = subprocess.run(
                    [
                        "ffmpeg", "-y",
                        "-i", tmp_path,
                        "-t", "15",          # only first 15 seconds
                        "-c:v", "libx264",
                        "-c:a", "aac",
                        "-preset", "fast",
                        "-crf", "28",        # slight quality reduction to keep file small
                        trimmed_path,
                    ],
                    capture_output=True,
                    timeout=120,
                )
                if result.returncode == 0 and os.path.getsize(trimmed_path) > 0:
                    os.replace(trimmed_path, tmp_path)
                    size_mb = os.path.getsize(tmp_path) / 1_048_576
                    print(f"  Trimmed to 15s ({size_mb:.1f} MB)")
                else:
                    print(f"  FFmpeg trim failed (using full video): {result.stderr[-200:]}")
            except (FileNotFoundError, Exception) as trim_err:
                print(f"  FFmpeg not available or failed ({trim_err}), using full video")
            finally:
                if os.path.exists(trimmed_path):
                    os.unlink(trimmed_path)

            # 4. Upload to Supabase Storage
            safe_handle = handle.replace("/", "_").replace("@", "")
            storage_name = f"{platform}_{safe_handle}.mp4"
            public_url = _upload_to_supabase(tmp_path, storage_name)

            if not public_url:
                print("  Skipped (upload failed)\n")
                failed += 1
                continue

            print(f"  Uploaded  → {public_url}")

            # 5. Update DB
            cur.execute(
                "UPDATE influencer_profiles SET viral_video_url = %s WHERE id = %s",
                (public_url, inf_id),
            )
            conn.commit()
            print(f"  DB updated ✓\n")
            updated += 1

        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

        # Small pause between influencers to reduce rate-limit risk
        time.sleep(8)

    cur.close()
    conn.close()

    print(f"Done. {updated} updated, {failed} failed.")
    if failed > 0 and updated == 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
