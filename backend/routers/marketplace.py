import models, schemas, database, auth

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.future import select
from typing import List
from datetime import datetime, timezone, timedelta

DISPUTE_WINDOW_HOURS = 48

router = APIRouter(prefix="/marketplace", tags=["marketplace"])

db_dependency = Depends(database.get_db)


@router.get("/influencers", response_model=List[schemas.InfluencerProfile])
def get_all_influencers(limit: int = 50, db: Session = db_dependency):
    result = db.execute(
        select(models.InfluencerProfile)
        .options(selectinload(models.InfluencerProfile.services))
        .join(models.User)
        .filter(models.User.is_active == True)
        .limit(limit)
    )
    return result.scalars().all()


@router.get("/influencers/{influencer_id}", response_model=schemas.InfluencerProfile)
def get_influencer_details(influencer_id: int, db: Session = db_dependency):
    result = db.execute(
        select(models.InfluencerProfile)
        .options(selectinload(models.InfluencerProfile.services))
        .filter(models.InfluencerProfile.id == influencer_id)
    )
    profile = result.scalars().first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Influencer not found.")
    return profile


@router.post("/requests", response_model=schemas.EngagementRequest, status_code=status.HTTP_201_CREATED)
def submit_engagement_request(
    request_data: schemas.EngagementRequestCreate,
    db: Session = db_dependency,
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role != models.UserRole.FAN:
        raise HTTPException(status_code=403, detail="Only fans can submit engagement requests.")

    service = db.execute(
        select(models.EngagementService).filter(
            models.EngagementService.id == request_data.service_id,
            models.EngagementService.is_active == True
        )
    ).scalars().first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found or inactive.")

    db_request = models.EngagementRequest(
        fan_id=current_user.id,
        service_id=request_data.service_id,
        generated_image_preview_url=request_data.generated_image_preview_url,
        payment_intent_id=request_data.payment_intent_id or f"pi_placeholder_{service.id}",
        status=models.RequestStatus.PENDING
    )
    db.add(db_request)
    db.commit()
    db.refresh(db_request)
    return db_request


@router.get("/requests/my", response_model=List[schemas.EngagementRequest])
def get_my_fan_requests(
    db: Session = db_dependency,
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role != models.UserRole.FAN:
        raise HTTPException(status_code=403, detail="Only fans can view their requests.")
    result = db.execute(
        select(models.EngagementRequest)
        .options(selectinload(models.EngagementRequest.service))
        .filter(models.EngagementRequest.fan_id == current_user.id)
        .order_by(models.EngagementRequest.created_at.desc())
    )
    requests = result.scalars().all()

    # Lazy auto-verify: if 48h have passed since fulfilled_at with no dispute, release payment
    now = datetime.now(timezone.utc)
    auto_verified = False
    for req in requests:
        if req.status == models.RequestStatus.FULFILLED and req.fulfilled_at:
            fulfilled_at = req.fulfilled_at.replace(tzinfo=timezone.utc) if req.fulfilled_at.tzinfo is None else req.fulfilled_at
            if now - fulfilled_at >= timedelta(hours=DISPUTE_WINDOW_HOURS):
                req.status = models.RequestStatus.VERIFIED
                auto_verified = True
    if auto_verified:
        db.commit()

    return requests


@router.post("/requests/{request_id}/cancel", response_model=schemas.EngagementRequest)
def cancel_request(
    request_id: int,
    db: Session = db_dependency,
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role != models.UserRole.FAN:
        raise HTTPException(status_code=403, detail="Only fans can cancel requests.")
    db_request = db.execute(
        select(models.EngagementRequest).filter(
            models.EngagementRequest.id == request_id,
            models.EngagementRequest.fan_id == current_user.id
        )
    ).scalars().first()
    if not db_request:
        raise HTTPException(status_code=404, detail="Request not found.")
    if db_request.status not in [models.RequestStatus.PENDING, models.RequestStatus.COUNTER_OFFERED]:
        raise HTTPException(status_code=400, detail="Can only cancel pending or counter-offered requests.")
    db_request.status = models.RequestStatus.CANCELLED
    db.commit()
    db.refresh(db_request)
    return db_request


@router.post("/requests/{request_id}/accept-counter-offer", response_model=schemas.EngagementRequest)
def accept_counter_offer(
    request_id: int,
    db: Session = db_dependency,
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role != models.UserRole.FAN:
        raise HTTPException(status_code=403, detail="Only fans can accept counter offers.")
    db_request = db.execute(
        select(models.EngagementRequest).filter(
            models.EngagementRequest.id == request_id,
            models.EngagementRequest.fan_id == current_user.id
        )
    ).scalars().first()
    if not db_request:
        raise HTTPException(status_code=404, detail="Request not found.")
    if db_request.status != models.RequestStatus.COUNTER_OFFERED:
        raise HTTPException(status_code=400, detail="Request is not in COUNTER_OFFERED state.")
    db_request.status = models.RequestStatus.PENDING
    db.commit()
    db.refresh(db_request)
    return db_request


@router.post("/requests/{request_id}/reject-counter-offer", response_model=schemas.EngagementRequest)
def reject_counter_offer(
    request_id: int,
    db: Session = db_dependency,
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role != models.UserRole.FAN:
        raise HTTPException(status_code=403, detail="Only fans can reject counter offers.")
    db_request = db.execute(
        select(models.EngagementRequest).filter(
            models.EngagementRequest.id == request_id,
            models.EngagementRequest.fan_id == current_user.id
        )
    ).scalars().first()
    if not db_request:
        raise HTTPException(status_code=404, detail="Request not found.")
    if db_request.status != models.RequestStatus.COUNTER_OFFERED:
        raise HTTPException(status_code=400, detail="Request is not in COUNTER_OFFERED state.")
    db_request.status = models.RequestStatus.CANCELLED
    db.commit()
    db.refresh(db_request)
    return db_request


@router.post("/requests/{request_id}/dispute", response_model=schemas.EngagementRequest)
def dispute_fulfillment(
    request_id: int,
    dispute_data: schemas.DisputeRequest,
    db: Session = db_dependency,
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role != models.UserRole.FAN:
        raise HTTPException(status_code=403, detail="Only fans can dispute requests.")
    db_request = db.execute(
        select(models.EngagementRequest).filter(
            models.EngagementRequest.id == request_id,
            models.EngagementRequest.fan_id == current_user.id
        )
    ).scalars().first()
    if not db_request:
        raise HTTPException(status_code=404, detail="Request not found.")
    if db_request.status != models.RequestStatus.FULFILLED:
        raise HTTPException(status_code=400, detail="Only fulfilled requests can be disputed.")

    # Enforce 48h window
    if db_request.fulfilled_at:
        fulfilled_at = db_request.fulfilled_at.replace(tzinfo=timezone.utc) if db_request.fulfilled_at.tzinfo is None else db_request.fulfilled_at
        if datetime.now(timezone.utc) - fulfilled_at > timedelta(hours=DISPUTE_WINDOW_HOURS):
            raise HTTPException(
                status_code=400,
                detail=f"The {DISPUTE_WINDOW_HOURS}-hour dispute window has passed. Payment has been auto-released."
            )

    db_request.status = models.RequestStatus.DISPUTED
    db_request.dispute_reason = dispute_data.reason
    db.commit()
    db.refresh(db_request)
    return db_request


@router.post("/requests/{request_id}/verify", response_model=schemas.EngagementRequest)
def verify_fulfillment(
    request_id: int,
    db: Session = db_dependency,
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role != models.UserRole.FAN:
        raise HTTPException(status_code=403, detail="Only fans can verify fulfillment.")
    db_request = db.execute(
        select(models.EngagementRequest).filter(
            models.EngagementRequest.id == request_id,
            models.EngagementRequest.fan_id == current_user.id
        )
    ).scalars().first()
    if not db_request:
        raise HTTPException(status_code=404, detail="Request not found.")
    if db_request.status != models.RequestStatus.FULFILLED:
        raise HTTPException(status_code=400, detail="Request is not in FULFILLED state.")
    db_request.status = models.RequestStatus.VERIFIED
    db.commit()
    db.refresh(db_request)
    return db_request
