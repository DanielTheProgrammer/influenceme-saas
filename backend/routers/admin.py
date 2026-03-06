import models, schemas, database, auth

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.future import select
from pydantic import BaseModel
from typing import List, Optional
import os

router = APIRouter(prefix="/admin", tags=["admin"])

db_dependency = Depends(database.get_db)

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "")


def require_admin(current_user: models.User = Depends(auth.get_current_active_user)):
    if not ADMIN_EMAIL:
        raise HTTPException(status_code=503, detail="Admin not configured.")
    if current_user.email != ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Admin access required.")
    return current_user


class PendingVerification(BaseModel):
    profile_id: int
    display_name: str
    instagram_handle: Optional[str]
    tiktok_handle: Optional[str]
    instagram_verification_status: str
    tiktok_verification_status: str
    verification_code: Optional[str]


class PlatformStats(BaseModel):
    total_requests: int
    pending: int
    approved: int
    fulfilled: int
    verified: int
    rejected: int
    cancelled: int


@router.get("/verifications", response_model=List[PendingVerification])
def list_pending_verifications(
    db: Session = db_dependency,
    _admin: models.User = Depends(require_admin)
):
    profiles = db.execute(
        select(models.InfluencerProfile).filter(
            (models.InfluencerProfile.instagram_verification_status == "pending") |
            (models.InfluencerProfile.tiktok_verification_status == "pending")
        )
    ).scalars().all()

    return [
        PendingVerification(
            profile_id=p.id,
            display_name=p.display_name or "Unknown",
            instagram_handle=p.instagram_handle,
            tiktok_handle=p.tiktok_handle,
            instagram_verification_status=p.instagram_verification_status,
            tiktok_verification_status=p.tiktok_verification_status,
            verification_code=p.verification_code,
        )
        for p in profiles
    ]


@router.post("/verify/{profile_id}/{platform}")
def manually_verify(
    profile_id: int,
    platform: str,
    db: Session = db_dependency,
    _admin: models.User = Depends(require_admin)
):
    if platform not in ("instagram", "tiktok"):
        raise HTTPException(status_code=400, detail="Platform must be 'instagram' or 'tiktok'.")
    profile = db.execute(
        select(models.InfluencerProfile).filter(models.InfluencerProfile.id == profile_id)
    ).scalars().first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found.")
    if platform == "instagram":
        profile.instagram_verification_status = "verified"
    else:
        profile.tiktok_verification_status = "verified"
    db.commit()
    return {"status": "verified", "platform": platform, "profile_id": profile_id}


@router.post("/reject-verify/{profile_id}/{platform}")
def reject_verification(
    profile_id: int,
    platform: str,
    db: Session = db_dependency,
    _admin: models.User = Depends(require_admin)
):
    if platform not in ("instagram", "tiktok"):
        raise HTTPException(status_code=400, detail="Platform must be 'instagram' or 'tiktok'.")
    profile = db.execute(
        select(models.InfluencerProfile).filter(models.InfluencerProfile.id == profile_id)
    ).scalars().first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found.")
    if platform == "instagram":
        profile.instagram_verification_status = "unverified"
    else:
        profile.tiktok_verification_status = "unverified"
    db.commit()
    return {"status": "rejected", "platform": platform, "profile_id": profile_id}


@router.get("/stats", response_model=PlatformStats)
def get_platform_stats(
    db: Session = db_dependency,
    _admin: models.User = Depends(require_admin)
):
    all_requests = db.execute(select(models.EngagementRequest)).scalars().all()
    counts = {s.value: 0 for s in models.RequestStatus}
    for r in all_requests:
        counts[r.status.value] += 1

    return PlatformStats(
        total_requests=len(all_requests),
        pending=counts.get("pending", 0),
        approved=counts.get("approved", 0),
        fulfilled=counts.get("fulfilled", 0),
        verified=counts.get("verified", 0),
        rejected=counts.get("rejected", 0),
        cancelled=counts.get("cancelled", 0),
    )
