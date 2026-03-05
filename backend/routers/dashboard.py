import models, schemas, database, auth

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.future import select
from typing import List

router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"],
    dependencies=[Depends(auth.get_current_active_user)]
)

db_dependency = Depends(database.get_db)


@router.get("/requests", response_model=List[schemas.EngagementRequest])
def get_my_engagement_requests(
    db: Session = db_dependency,
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role != models.UserRole.INFLUENCER:
        raise HTTPException(status_code=403, detail="Only influencers can access this resource.")
    profile = db.execute(
        select(models.InfluencerProfile).filter(models.InfluencerProfile.user_id == current_user.id)
    ).scalars().first()
    if not profile:
        raise HTTPException(status_code=404, detail="Influencer profile not found.")

    requests = db.execute(
        select(models.EngagementRequest)
        .join(models.EngagementService)
        .filter(models.EngagementService.influencer_id == profile.id)
        .order_by(models.EngagementRequest.created_at.desc())
    ).scalars().all()
    return requests
