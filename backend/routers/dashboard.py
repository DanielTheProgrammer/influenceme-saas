import models, schemas, database, auth

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List

router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"],
    dependencies=[Depends(auth.get_current_active_user)]
)

db_dependency = Depends(database.get_db)


@router.get("/requests", response_model=List[schemas.EngagementRequest])
async def get_my_engagement_requests(
    db: AsyncSession = db_dependency,
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role != models.UserRole.INFLUENCER:
        raise HTTPException(status_code=403, detail="Only influencers can access this resource.")
    profile_res = await db.execute(
        select(models.InfluencerProfile).filter(models.InfluencerProfile.user_id == current_user.id)
    )
    profile = profile_res.scalars().first()
    if not profile:
        raise HTTPException(status_code=404, detail="Influencer profile not found.")

    requests_res = await db.execute(
        select(models.EngagementRequest)
        .join(models.EngagementService)
        .filter(models.EngagementService.influencer_id == profile.id)
        .order_by(models.EngagementRequest.created_at.desc())
    )
    return requests_res.scalars().all()
