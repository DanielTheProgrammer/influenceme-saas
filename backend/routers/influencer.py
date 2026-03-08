import models, schemas, database, auth
from limiter import limiter

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.future import select
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import os
from dotenv import load_dotenv

load_dotenv()

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_PRICE_ID_PRO = os.getenv("STRIPE_PRICE_ID_PRO", "")


def get_stripe():
    if STRIPE_SECRET_KEY and not STRIPE_SECRET_KEY.startswith("YOUR_"):
        import stripe
        stripe.api_key = STRIPE_SECRET_KEY
        return stripe
    return None


def _cancel_payment_intent(payment_intent_id: str | None):
    """Cancel a manual-capture PaymentIntent, releasing the card hold."""
    if not payment_intent_id or payment_intent_id.startswith("pi_mock_") or payment_intent_id.startswith("pi_placeholder_"):
        return
    stripe = get_stripe()
    if not stripe:
        return
    try:
        stripe.PaymentIntent.cancel(payment_intent_id)
    except Exception:
        pass  # already cancelled or no such intent — safe to ignore


def _capture_payment_intent(payment_intent_id: str | None):
    """Capture a manual-capture PaymentIntent, collecting payment from the fan."""
    if not payment_intent_id or payment_intent_id.startswith("pi_mock_") or payment_intent_id.startswith("pi_placeholder_"):
        return
    stripe = get_stripe()
    if not stripe:
        return
    try:
        stripe.PaymentIntent.capture(payment_intent_id)
    except Exception:
        pass  # already captured or cancelled — safe to ignore

router = APIRouter(
    prefix="/influencer",
    tags=["influencer"],
    dependencies=[Depends(auth.get_current_active_user)]
)

db_dependency = Depends(database.get_db)


def _get_influencer_profile(current_user: models.User, db: Session):
    if current_user.role != models.UserRole.INFLUENCER:
        raise HTTPException(status_code=403, detail="Only influencers can access this resource.")
    profile = db.execute(
        select(models.InfluencerProfile).filter(models.InfluencerProfile.user_id == current_user.id)
    ).scalars().first()
    if not profile:
        raise HTTPException(status_code=404, detail="Influencer profile not found.")
    return profile


def _get_owned_request(request_id: int, influencer_profile: models.InfluencerProfile, db: Session):
    db_request = db.execute(
        select(models.EngagementRequest)
        .join(models.EngagementService)
        .join(models.InfluencerProfile)
        .filter(
            models.EngagementRequest.id == request_id,
            models.InfluencerProfile.user_id == influencer_profile.user_id
        )
    ).scalars().first()
    if not db_request:
        raise HTTPException(status_code=404, detail="Request not found or you do not have permission.")
    return db_request


@router.get("/requests", response_model=List[schemas.EngagementRequest])
def get_my_engagement_requests(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = db_dependency
):
    profile = _get_influencer_profile(current_user, db)
    service_ids = db.execute(
        select(models.EngagementService.id).filter(models.EngagementService.influencer_id == profile.id)
    ).scalars().all()
    if not service_ids:
        return []

    return db.execute(
        select(models.EngagementRequest)
        .filter(models.EngagementRequest.service_id.in_(service_ids))
        .options(selectinload(models.EngagementRequest.service))
        .order_by(models.EngagementRequest.created_at.desc())
    ).scalars().all()


@router.post("/requests/{request_id}/approve", response_model=schemas.EngagementRequest)
@limiter.limit("20/minute")
def approve_engagement_request(
    request: Request,
    request_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = db_dependency
):
    profile = _get_influencer_profile(current_user, db)
    db_request = _get_owned_request(request_id, profile, db)
    if db_request.status != models.RequestStatus.PENDING:
        raise HTTPException(status_code=400, detail=f"Request is in {db_request.status} state, not PENDING.")
    db_request.status = models.RequestStatus.APPROVED
    db.commit()
    db.refresh(db_request)
    return db_request


@router.post("/requests/{request_id}/reject", response_model=schemas.EngagementRequest)
@limiter.limit("20/minute")
def reject_engagement_request(
    request: Request,
    request_id: int,
    reject_data: schemas.RejectRequest,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = db_dependency
):
    profile = _get_influencer_profile(current_user, db)
    db_request = _get_owned_request(request_id, profile, db)
    if db_request.status != models.RequestStatus.PENDING:
        raise HTTPException(status_code=400, detail=f"Request is in {db_request.status} state, not PENDING.")
    db_request.status = models.RequestStatus.REJECTED
    db_request.rejection_reason = reject_data.rejection_reason
    db.commit()
    db.refresh(db_request)
    # Release the card hold — fan is not charged
    _cancel_payment_intent(db_request.payment_intent_id)
    return db_request


@router.post("/requests/{request_id}/counter-offer", response_model=schemas.EngagementRequest)
@limiter.limit("20/minute")
def counter_offer_engagement_request(
    request: Request,
    request_id: int,
    counter_offer_data: schemas.CounterOfferRequest,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = db_dependency
):
    profile = _get_influencer_profile(current_user, db)
    db_request = _get_owned_request(request_id, profile, db)
    if db_request.status != models.RequestStatus.PENDING:
        raise HTTPException(status_code=400, detail=f"Request is in {db_request.status} state, not PENDING.")
    db_request.status = models.RequestStatus.COUNTER_OFFERED
    db_request.counter_offer_price = counter_offer_data.new_price
    db_request.counter_offer_description = counter_offer_data.new_description
    db.commit()
    db.refresh(db_request)
    return db_request


@router.post("/requests/{request_id}/fulfill", response_model=schemas.EngagementRequest)
@limiter.limit("20/minute")
def fulfill_engagement_request(
    request: Request,
    request_id: int,
    fulfill_data: schemas.FulfillRequest,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = db_dependency
):
    profile = _get_influencer_profile(current_user, db)
    db_request = _get_owned_request(request_id, profile, db)
    if db_request.status != models.RequestStatus.APPROVED:
        raise HTTPException(status_code=400, detail=f"Request is in {db_request.status} state, not APPROVED.")

    if not fulfill_data.proof_url and not fulfill_data.proof_screenshot_url:
        raise HTTPException(status_code=400, detail="You must provide at least one proof: a post URL or a screenshot URL.")

    db_request.status = models.RequestStatus.FULFILLED
    db_request.proof_url = fulfill_data.proof_url
    db_request.proof_screenshot_url = fulfill_data.proof_screenshot_url
    db_request.fulfilled_at = datetime.now(timezone.utc)
    if fulfill_data.final_image_url:
        db_request.generated_image_final_url = fulfill_data.final_image_url
    db.commit()
    db.refresh(db_request)
    return db_request


# ─── Analytics ─────────────────────────────────────────────────────────────

@router.get("/analytics")
def get_analytics(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = db_dependency
):
    profile = _get_influencer_profile(current_user, db)
    service_ids = db.execute(
        select(models.EngagementService.id).filter(models.EngagementService.influencer_id == profile.id)
    ).scalars().all()

    reqs = db.execute(
        select(models.EngagementRequest)
        .filter(models.EngagementRequest.service_id.in_(service_ids))
        .options(selectinload(models.EngagementRequest.service))
    ).scalars().all() if service_ids else []

    total = len(reqs)
    by_status: dict = {}
    for r in reqs:
        key = r.status.value if hasattr(r.status, "value") else str(r.status)
        by_status[key] = by_status.get(key, 0) + 1

    platform_fee = float(os.getenv("PLATFORM_FEE_PERCENT", "20")) / 100
    verified = [r for r in reqs if str(r.status) in ("verified", "RequestStatus.VERIFIED")]
    gross = sum(r.service.price for r in verified if r.service)
    net = gross * (1 - platform_fee)

    return {
        "total_requests": total,
        "by_status": by_status,
        "gross_earnings": round(gross, 2),
        "net_earnings": round(net, 2),
        "platform_fee_percent": int(platform_fee * 100),
        "conversion_rate": round(len(verified) / total * 100, 1) if total > 0 else 0.0,
        "pending_count": by_status.get("pending", 0),
        "approved_count": by_status.get("approved", 0),
        "fulfilled_count": by_status.get("fulfilled", 0),
        "verified_count": len(verified),
        "rejected_count": by_status.get("rejected", 0),
    }


# ─── Social Verification ───────────────────────────────────────────────────

class VerificationRequest(BaseModel):
    platform: str  # "instagram" | "tiktok"


@router.post("/verification/request")
def request_verification(
    body: VerificationRequest,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = db_dependency
):
    profile = _get_influencer_profile(current_user, db)
    if body.platform == "instagram":
        if not profile.instagram_handle:
            raise HTTPException(status_code=400, detail="No Instagram handle set on your profile.")
        profile.instagram_verification_status = "pending"
    elif body.platform == "tiktok":
        if not profile.tiktok_handle:
            raise HTTPException(status_code=400, detail="No TikTok handle set on your profile.")
        profile.tiktok_verification_status = "pending"
    else:
        raise HTTPException(status_code=400, detail="Platform must be 'instagram' or 'tiktok'.")
    db.commit()
    return {"status": "pending", "platform": body.platform}


# ─── Billing / Stripe Connect ──────────────────────────────────────────────

class BillingStatus(BaseModel):
    stripe_account_id: Optional[str]
    stripe_onboarding_complete: bool
    subscription_status: Optional[str]
    subscription_tier: Optional[str]

class SubscribeRequest(BaseModel):
    tier: str


@router.get("/billing/status", response_model=BillingStatus)
def get_billing_status(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = db_dependency
):
    profile = _get_influencer_profile(current_user, db)
    return BillingStatus(
        stripe_account_id=profile.stripe_account_id,
        stripe_onboarding_complete=profile.stripe_onboarding_complete or False,
        subscription_status=profile.subscription_status,
        subscription_tier=profile.subscription_tier,
    )


@router.post("/stripe/onboard")
def stripe_onboard(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = db_dependency
):
    profile = _get_influencer_profile(current_user, db)
    stripe = get_stripe()
    if not stripe:
        return {"url": None, "message": "Stripe not configured (dev mode)."}
    if not profile.stripe_account_id:
        account = stripe.Account.create(type="express", email=current_user.email)
        profile.stripe_account_id = account.id
        db.commit()
    link = stripe.AccountLink.create(
        account=profile.stripe_account_id,
        refresh_url=f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/influencer/billing",
        return_url=f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/influencer/billing?onboard=success",
        type="account_onboarding",
    )
    return {"url": link.url}


@router.post("/subscription/create")
def create_subscription(
    body: SubscribeRequest,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = db_dependency
):
    profile = _get_influencer_profile(current_user, db)
    stripe = get_stripe()
    if not stripe or not STRIPE_PRICE_ID_PRO:
        profile.subscription_tier = body.tier
        profile.subscription_status = "active"
        db.commit()
        return {"url": None, "message": "Subscription activated (dev mode)."}
    session = stripe.checkout.Session.create(
        customer_email=current_user.email,
        payment_method_types=["card"],
        mode="subscription",
        line_items=[{"price": STRIPE_PRICE_ID_PRO, "quantity": 1}],
        success_url=f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/influencer/billing?sub=success",
        cancel_url=f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/influencer/billing",
        metadata={"influencer_id": profile.id, "tier": body.tier},
    )
    return {"url": session.url}
