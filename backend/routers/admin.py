import models, schemas, database, auth, email_service
from routers.influencer import _cancel_payment_intent, _capture_payment_intent, _payout_influencer

from fastapi import APIRouter, Depends, HTTPException
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


# ── Schemas ────────────────────────────────────────────────────────────────

class PendingVerification(BaseModel):
    profile_id: int
    display_name: str
    instagram_handle: Optional[str]
    tiktok_handle: Optional[str]
    instagram_verification_status: str
    tiktok_verification_status: str
    verification_code: Optional[str]


class PendingRegistration(BaseModel):
    profile_id: int
    user_id: int
    display_name: str
    instagram_handle: Optional[str]
    tiktok_handle: Optional[str]
    profile_picture_url: Optional[str]
    followers_count: Optional[int]
    bio: Optional[str]
    registered_at: Optional[str]


class DisputedRequest(BaseModel):
    request_id: int
    fan_id: int
    influencer_name: str
    engagement_type: str
    price: float
    dispute_reason: Optional[str]
    proof_url: Optional[str]
    proof_screenshot_url: Optional[str]
    fulfilled_at: Optional[str]


class ResolveDisputeRequest(BaseModel):
    action: str  # "approve_payout" | "refund"


class PlatformStats(BaseModel):
    total_requests: int
    pending: int
    approved: int
    fulfilled: int
    verified: int
    rejected: int
    cancelled: int
    disputed: int
    pending_registrations: int
    pending_verifications: int


# ── Verifications ─────────────────────────────────────────────────────────

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


# ── Registrations ──────────────────────────────────────────────────────────

@router.get("/registrations", response_model=List[PendingRegistration])
def list_pending_registrations(
    db: Session = db_dependency,
    _admin: models.User = Depends(require_admin)
):
    profiles = db.execute(
        select(models.InfluencerProfile)
        .join(models.User)
        .filter(models.InfluencerProfile.is_approved == False)
        .order_by(models.User.created_at.desc())
    ).scalars().all()

    result = []
    for p in profiles:
        user = db.execute(select(models.User).filter(models.User.id == p.user_id)).scalars().first()
        result.append(PendingRegistration(
            profile_id=p.id,
            user_id=p.user_id,
            display_name=p.display_name or "Unknown",
            instagram_handle=p.instagram_handle,
            tiktok_handle=p.tiktok_handle,
            profile_picture_url=p.profile_picture_url,
            followers_count=p.followers_count,
            bio=p.bio,
            registered_at=user.created_at.isoformat() if user and user.created_at else None,
        ))
    return result


@router.post("/registrations/{profile_id}/approve")
def approve_registration(
    profile_id: int,
    db: Session = db_dependency,
    _admin: models.User = Depends(require_admin)
):
    profile = db.execute(
        select(models.InfluencerProfile).filter(models.InfluencerProfile.id == profile_id)
    ).scalars().first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found.")
    profile.is_approved = True
    db.commit()
    influencer_user = db.execute(select(models.User).filter(models.User.id == profile.user_id)).scalars().first()
    if influencer_user:
        email_service.notify_influencer_approved(influencer_user.email, profile.display_name or influencer_user.email)
    return {"status": "approved", "profile_id": profile_id}


@router.post("/registrations/{profile_id}/reject")
def reject_registration(
    profile_id: int,
    db: Session = db_dependency,
    _admin: models.User = Depends(require_admin)
):
    profile = db.execute(
        select(models.InfluencerProfile).filter(models.InfluencerProfile.id == profile_id)
    ).scalars().first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found.")
    # Mark as rejected by setting a flag — we keep the profile but unapproved
    profile.is_approved = False
    db.commit()
    return {"status": "rejected", "profile_id": profile_id}


# ── Disputes ───────────────────────────────────────────────────────────────

@router.get("/disputes", response_model=List[DisputedRequest])
def list_disputes(
    db: Session = db_dependency,
    _admin: models.User = Depends(require_admin)
):
    requests = db.execute(
        select(models.EngagementRequest)
        .options(selectinload(models.EngagementRequest.service))
        .filter(models.EngagementRequest.status == models.RequestStatus.DISPUTED)
        .order_by(models.EngagementRequest.updated_at.desc())
    ).scalars().all()

    result = []
    for r in requests:
        influencer_profile = db.execute(
            select(models.InfluencerProfile).filter(
                models.InfluencerProfile.id == r.service.influencer_id
            )
        ).scalars().first() if r.service else None

        result.append(DisputedRequest(
            request_id=r.id,
            fan_id=r.fan_id,
            influencer_name=influencer_profile.display_name if influencer_profile else "Unknown",
            engagement_type=r.service.engagement_type.value if r.service else "unknown",
            price=r.service.price if r.service else 0,
            dispute_reason=r.dispute_reason,
            proof_url=r.proof_url,
            proof_screenshot_url=r.proof_screenshot_url,
            fulfilled_at=r.fulfilled_at.isoformat() if r.fulfilled_at else None,
        ))
    return result


@router.post("/disputes/{request_id}/resolve")
def resolve_dispute(
    request_id: int,
    body: ResolveDisputeRequest,
    db: Session = db_dependency,
    _admin: models.User = Depends(require_admin)
):
    if body.action not in ("approve_payout", "refund"):
        raise HTTPException(status_code=400, detail="Action must be 'approve_payout' or 'refund'.")

    req = db.execute(
        select(models.EngagementRequest).filter(
            models.EngagementRequest.id == request_id,
            models.EngagementRequest.status == models.RequestStatus.DISPUTED
        )
    ).scalars().first()
    if not req:
        raise HTTPException(status_code=404, detail="Disputed request not found.")

    req.status = models.RequestStatus.VERIFIED if body.action == "approve_payout" else models.RequestStatus.CANCELLED
    db.commit()
    # Stripe: capture + transfer to influencer (approve) or cancel hold (refund fan)
    if body.action == "approve_payout":
        _capture_payment_intent(req.payment_intent_id)
        _payout_influencer(req, db)
    else:
        _cancel_payment_intent(req.payment_intent_id)
    return {"status": body.action, "request_id": request_id}


# ── Stats ──────────────────────────────────────────────────────────────────

@router.get("/stats", response_model=PlatformStats)
def get_platform_stats(
    db: Session = db_dependency,
    _admin: models.User = Depends(require_admin)
):
    all_requests = db.execute(select(models.EngagementRequest)).scalars().all()
    counts = {s.value: 0 for s in models.RequestStatus}
    for r in all_requests:
        counts[r.status.value] += 1

    pending_registrations = db.execute(
        select(models.InfluencerProfile).filter(models.InfluencerProfile.is_approved == False)
    ).scalars().all()

    pending_verifications = db.execute(
        select(models.InfluencerProfile).filter(
            (models.InfluencerProfile.instagram_verification_status == "pending") |
            (models.InfluencerProfile.tiktok_verification_status == "pending")
        )
    ).scalars().all()

    return PlatformStats(
        total_requests=len(all_requests),
        pending=counts.get("pending", 0),
        approved=counts.get("approved", 0),
        fulfilled=counts.get("fulfilled", 0),
        verified=counts.get("verified", 0),
        rejected=counts.get("rejected", 0),
        cancelled=counts.get("cancelled", 0),
        disputed=counts.get("disputed", 0),
        pending_registrations=len(pending_registrations),
        pending_verifications=len(pending_verifications),
    )
