import models, schemas, database, auth
from routers import marketplace, genai, influencer, influencers, dashboard, payments, social, admin

from fastapi import FastAPI, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from limiter import limiter
from sqlalchemy.orm import Session
from sqlalchemy.future import select
from sqlalchemy import text
from datetime import timedelta
from dotenv import load_dotenv
import os
import threading

load_dotenv()

app = FastAPI(
    title="Influencer Engagement SaaS",
    description="A marketplace for fans to purchase engagements from influencers.",
    version="0.1.0"
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _refresh_viral_videos_background():
    """
    Background daemon thread: downloads the most-viral TikTok video for each
    influencer who has a social handle, saves it to /tmp, then updates the DB
    with the backend URL at which it can be served.

    Serving from our own backend avoids TikTok CDN CORS blocks and signed-URL
    expiry (CDN URLs expire in ~5 minutes; local files last for the lifetime of
    the Vercel function instance).

    Re-runs on every cold start so files are always fresh.
    """
    try:
        from routers.social import download_viral_video, _video_file_path
        import os

        with database.engine.connect() as conn:
            rows = conn.execute(text(
                "SELECT id, tiktok_handle, instagram_handle FROM influencer_profiles "
                "WHERE tiktok_handle IS NOT NULL OR instagram_handle IS NOT NULL"
            )).fetchall()

        if not rows:
            return

        # Only process influencers whose local file is missing or empty
        needs = [r for r in rows
                 if not os.path.exists(_video_file_path(
                     "tiktok" if r[1] else "instagram",
                     (r[1] or r[2]).strip().lstrip("@")
                 )) or os.path.getsize(_video_file_path(
                     "tiktok" if r[1] else "instagram",
                     (r[1] or r[2]).strip().lstrip("@")
                 )) == 0]

        if not needs:
            print("[viral_video] All video files already on disk — nothing to download.")
            return

        print(f"[viral_video] Downloading videos for {len(needs)} influencer(s)…")
        for row in needs:
            inf_id, tiktok, ig = row[0], row[1], row[2]
            platform = "tiktok" if tiktok else "instagram"
            handle = (tiktok or ig).strip().lstrip("@")
            print(f"[viral_video] Downloading {platform}/@{handle} (id={inf_id})…")
            try:
                video_url = download_viral_video(platform, handle)
                if video_url:
                    with database.engine.connect() as conn:
                        conn.execute(
                            text("UPDATE influencer_profiles SET viral_video_url = :url WHERE id = :id"),
                            {"url": video_url, "id": inf_id},
                        )
                        conn.commit()
                    print(f"[viral_video] id={inf_id} → {video_url}")
                else:
                    print(f"[viral_video] id={inf_id}: download failed for {platform}/@{handle}")
            except Exception as exc:
                print(f"[viral_video] id={inf_id} error: {exc}")

    except Exception as exc:
        print(f"[viral_video] Background refresh failed: {exc}")


@app.on_event("startup")
def on_startup():
    try:
        database.Base.metadata.create_all(database.engine)
    except Exception as e:
        print(f"[startup] WARNING: Could not create tables: {e}")

    # Demo video URLs for seeded influencers (free CDN mp4s used as placeholders)
    _demo_videos = [
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4",
    ]

    # Incremental column migrations — run for ALL db types, ignore errors per statement
    # (PostgreSQL uses IF NOT EXISTS; SQLite silently ignores duplicate adds via try/except)
    _col_migrations = [
        "ALTER TABLE influencer_profiles ADD COLUMN IF NOT EXISTS verification_code VARCHAR",
        "ALTER TABLE influencer_profiles ADD COLUMN IF NOT EXISTS instagram_verification_status VARCHAR DEFAULT 'unverified'",
        "ALTER TABLE influencer_profiles ADD COLUMN IF NOT EXISTS tiktok_verification_status VARCHAR DEFAULT 'unverified'",
        "ALTER TABLE influencer_profiles ADD COLUMN IF NOT EXISTS followers_count INTEGER",
        "ALTER TABLE influencer_profiles ADD COLUMN IF NOT EXISTS recent_post_urls TEXT",
        "ALTER TABLE influencer_profiles ADD COLUMN IF NOT EXISTS viral_video_url VARCHAR",
        "ALTER TABLE engagement_requests ADD COLUMN IF NOT EXISTS proof_url VARCHAR",
    ]

    # Data migration: give demo video URLs to seeded influencers that have none yet
    _data_migrations = [
        f"""UPDATE influencer_profiles SET viral_video_url =
            CASE (id % {len(_demo_videos)})
                {" ".join(f"WHEN {i} THEN '{url}'" for i, url in enumerate(_demo_videos))}
                ELSE '{_demo_videos[0]}'
            END
            WHERE viral_video_url IS NULL""",

        # Fix seeded influencer handles that have no public TikTok videos —
        # replace with verified-working handles so yt-dlp can fetch real videos.
        # Guarded by the OLD handle so this only fires once per row.
        "UPDATE influencer_profiles SET tiktok_handle='charlidamelio', instagram_handle='charlidamelio', profile_picture_url='https://unavatar.io/tiktok/charlidamelio', viral_video_url=NULL WHERE tiktok_handle='eskimoninja_official'",
        "UPDATE influencer_profiles SET tiktok_handle='addisonre',      instagram_handle='addisonre',      profile_picture_url='https://unavatar.io/tiktok/addisonre',      viral_video_url=NULL WHERE tiktok_handle='nicoletravelgal'",
        "UPDATE influencer_profiles SET tiktok_handle='bellapoarch',    instagram_handle='bellapoarch',    profile_picture_url='https://unavatar.io/tiktok/bellapoarch',    viral_video_url=NULL WHERE tiktok_handle='chelseydavisxo'",
        "UPDATE influencer_profiles SET tiktok_handle='avani',          instagram_handle='avani.gregg',    profile_picture_url='https://unavatar.io/tiktok/avani',          viral_video_url=NULL WHERE tiktok_handle='jasminefit'",
        "UPDATE influencer_profiles SET tiktok_handle='noahbeck',       instagram_handle='noahbeck',       profile_picture_url='https://unavatar.io/tiktok/noahbeck',       viral_video_url=NULL WHERE tiktok_handle='jyhodges'",
        "UPDATE influencer_profiles SET tiktok_handle='savannahdemers', instagram_handle='savannahdemers', profile_picture_url='https://unavatar.io/tiktok/savannahdemers', viral_video_url=NULL WHERE tiktok_handle='nutriacure'",
    ]

    try:
        with database.engine.connect() as conn:
            for sql in _col_migrations:
                try:
                    conn.execute(text(sql))
                except Exception as col_err:
                    print(f"[startup] Column migration skipped (likely exists): {col_err}")
            for sql in _data_migrations:
                try:
                    conn.execute(text(sql))
                except Exception as data_err:
                    print(f"[startup] Data migration failed: {data_err}")
            conn.commit()
    except Exception as e:
        print(f"[startup] WARNING: Migration block failed: {e}")

    # Background: replace placeholder demo videos with real CDN URLs from yt-dlp
    threading.Thread(target=_refresh_viral_videos_background, daemon=True).start()


@app.get("/")
def read_root():
    return {"message": "Welcome to the Influencer Engagement Platform API"}


@app.get("/health")
def health_check():
    db_url = os.getenv("DATABASE_URL", "NOT SET")
    safe_url = db_url.split("@")[-1] if "@" in db_url else db_url
    try:
        with database.engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ok", "db": safe_url}
    except Exception as e:
        return {"status": "error", "db": safe_url, "detail": str(e)}


@app.post("/token", response_model=schemas.Token)
@limiter.limit(os.getenv("RATE_LIMIT_LOGIN", "20/minute"))
def login_for_access_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(database.get_db)
):
    user = db.execute(select(models.User).filter(models.User.email == form_data.username)).scalars().first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/auth/register", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
@limiter.limit(os.getenv("RATE_LIMIT_REGISTER", "10/minute"))
def register_user(request: Request, user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    if db.execute(select(models.User).filter(models.User.email == user.email)).scalars().first():
        raise HTTPException(status_code=400, detail="Email already registered")

    db_user = models.User(
        email=user.email,
        hashed_password=auth.get_password_hash(user.password),
        role=user.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@app.get("/users/me/", response_model=schemas.User)
def read_users_me(current_user: models.User = Depends(auth.get_current_active_user)):
    return current_user


app.include_router(marketplace.router)
app.include_router(genai.router)
app.include_router(influencer.router)
app.include_router(influencers.router)
app.include_router(dashboard.router)
app.include_router(payments.router)
app.include_router(social.router)
app.include_router(admin.router)
