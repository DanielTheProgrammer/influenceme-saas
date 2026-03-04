import models, schemas, database, auth

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import List, Optional
import os
from dotenv import load_dotenv

load_dotenv()

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_PRICE_ID_PRO = os.getenv("STRIPE_PRICE_ID_PRO", "")  # Stripe price ID for Pro subscription


def get_stripe():
    if STRIPE_SECRET_KEY and not STRIPE_SECRET_KEY.startswith("YOUR_"):
        import stripe
        stripe.api_key = STRIPE_SECRET_KEY
        return stripe
    return None

router = APIRouter(
    prefix="/influencer",
    tags=["influencer"],
    dependencies=[Depends(auth.get_current_active_user)]
)

db_dependency = Depends(database.get_db)


async def _get_influencer_profile(current_user: models.User, db: AsyncSession):
    """Helper: get influencer profile or raise 403/404."""
    if current_user.role != models.UserRole.INFLUENCER:
        raise HTTPException(status_code=403, detail="Only influencers can access this resource.")
    result = await db.execute(
        select(models.InfluencerProfile).filter(models.InfluencerProfile.user_id == current_user.id)
    )
    profile = result.scalars().first()
    if not profile:
        raise HTTPException(status_code=404, detail="Influencer profile not found.")
    return profile


async def _get_owned_request(request_id: int, influencer_profile: models.InfluencerProfile, db: AsyncSession):
    """Helper: get a request that belongs to this influencer, or raise 404."""
    result = await db.execute(
        select(models.EngagementRequest)
        .join(models.EngagementService)
        .join(models.InfluencerProfile)
        .filter(
            models.EngagementRequest.id == request_id,
            models.InfluencerProfile.user_id == influencer_profile.user_id
        )
    )
    db_request = result.scalars().first()
    if not db_request:
        raise HTTPException(status_code=404, detail="Request not found or you do not have permission.")
    return db_request


@router.get("/requests", response_model=List[schemas.EngagementRequest])
async def get_my_engagement_requests(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: AsyncSession = db_dependency
):
    profile = await _get_influencer_profile(current_user, db)
    services_result = await db.execute(
        select(models.EngagementService.id).filter(models.EngagementService.influencer_id == profile.id)
    )
    service_ids = services_result.scalars().all()
    if not service_ids:
        return []

    requests_result = await db.execute(
        select(models.EngagementRequest)
        .filter(models.EngagementRequest.service_id.in_(service_ids))
        .options(selectinload(models.EngagementRequest.service))
        .order_by(models.EngagementRequest.created_at.desc())
    )
    return requests_result.scalars().all()


@router.post("/requests/{request_id}/approve", response_model=schemas.EngagementRequest)
async def approve_engagement_request(
    request_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: AsyncSession = db_dependency
):
    profile = await _get_influencer_profile(current_user, db)
    db_request = await _get_owned_request(request_id, profile, db)

    if db_request.status != models.RequestStatus.PENDING:
        raise HTTPException(status_code=400, detail=f"Request is in {db_request.status} state, not PENDING.")

    db_request.status = models.RequestStatus.APPROVED
    await db.commit()
    await db.refresh(db_request)
    return db_request


@router.post("/requests/{request_id}/reject", response_model=schemas.EngagementRequest)
async def reject_engagement_request(
    request_id: int,
    reject_data: schemas.RejectRequest,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: AsyncSession = db_dependency
):
    profile = await _get_influencer_profile(current_user, db)
    db_request = await _get_owned_request(request_id, profile, db)

    if db_request.status != models.RequestStatus.PENDING:
        raise HTTPException(status_code=400, detail=f"Request is in {db_request.status} state, not PENDING.")

    db_request.status = models.RequestStatus.REJECTED
    db_request.rejection_reason = reject_data.rejection_reason
    await db.commit()
    await db.refresh(db_request)
    return db_request


@router.post("/requests/{request_id}/counter-offer", response_model=schemas.EngagementRequest)
async def counter_offer_engagement_request(
    request_id: int,
    counter_offer_data: schemas.CounterOfferRequest,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: AsyncSession = db_dependency
):
    profile = await _get_influencer_profile(current_user, db)
    db_request = await _get_owned_request(request_id, profile, db)

    if db_request.status != models.RequestStatus.PENDING:
        raise HTTPException(status_code=400, detail=f"Request is in {db_request.status} state, not PENDING.")

    db_request.status = models.RequestStatus.COUNTER_OFFERED
    db_request.counter_offer_price = counter_offer_data.new_price
    db_request.counter_offer_description = counter_offer_data.new_description
    await db.commit()
    await db.refresh(db_request)
    return db_request


@router.post("/requests/{request_id}/fulfill", response_model=schemas.EngagementRequest)
async def fulfill_engagement_request(
    request_id: int,
    fulfill_data: schemas.FulfillRequest,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: AsyncSession = db_dependency
):
    """Influencer marks request as fulfilled and optionally provides a final image URL."""
    profile = await _get_influencer_profile(current_user, db)
    db_request = await _get_owned_request(request_id, profile, db)

    if db_request.status != models.RequestStatus.APPROVED:
        raise HTTPException(status_code=400, detail=f"Request is in {db_request.status} state, not APPROVED.")

    db_request.status = models.RequestStatus.FULFILLED
    if fulfill_data.final_image_url:
        db_request.generated_image_final_url = fulfill_data.final_image_url
    await db.commit()
    await db.refresh(db_request)
    return db_request


# ─── Billing / Stripe Connect ──────────────────────────────────────────────

class BillingStatus(BaseModel):
    stripe_account_id: Optional[str]
    stripe_onboarding_complete: bool
    subscription_status: Optional[str]
    subscription_tier: Optional[str]

class SubscribeRequest(BaseModel):
    tier: str  # "pro"


@router.get("/billing/status", response_model=BillingStatus)
async def get_billing_status(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: AsyncSession = db_dependency
):
    profile = await _get_influencer_profile(current_user, db)
    return BillingStatus(
        stripe_account_id=profile.stripe_account_id,
        stripe_onboarding_complete=profile.stripe_onboarding_complete or False,
        subscription_status=profile.subscription_status,
        subscription_tier=profile.subscription_tier,
    )


@router.post("/stripe/onboard")
async def stripe_onboard(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: AsyncSession = db_dependency
):
    profile = await _get_influencer_profile(current_user, db)
    stripe = get_stripe()

    if not stripe:
        return {"url": None, "message": "Stripe not configured (dev mode)."}

    # Create Connect account if not already done
    if not profile.stripe_account_id:
        account = stripe.Account.create(type="express", email=current_user.email)
        profile.stripe_account_id = account.id
        await db.commit()

    # Generate onboarding link
    link = stripe.AccountLink.create(
        account=profile.stripe_account_id,
        refresh_url=f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/influencer/billing",
        return_url=f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/influencer/billing?onboard=success",
        type="account_onboarding",
    )
    return {"url": link.url}


@router.post("/subscription/create")
async def create_subscription(
    body: SubscribeRequest,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: AsyncSession = db_dependency
):
    profile = await _get_influencer_profile(current_user, db)
    stripe = get_stripe()

    if not stripe or not STRIPE_PRICE_ID_PRO:
        # Dev mode: just set tier directly
        profile.subscription_tier = body.tier
        profile.subscription_status = "active"
        await db.commit()
        return {"url": None, "message": "Subscription activated (dev mode)."}

    # Create Stripe Checkout session for subscription
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
