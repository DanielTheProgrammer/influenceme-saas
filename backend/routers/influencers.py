import models, schemas, database, auth

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List

router = APIRouter(
    prefix="/influencers",
    tags=["influencers"],
    dependencies=[Depends(auth.get_current_active_user)]
)

db_dependency = Depends(database.get_db)


@router.post("/profile", response_model=schemas.InfluencerProfile)
async def create_or_update_influencer_profile(
    profile_data: schemas.InfluencerProfileCreate,
    db: AsyncSession = db_dependency,
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role != models.UserRole.INFLUENCER:
        raise HTTPException(status_code=403, detail="Only influencers can manage profiles.")

    result = await db.execute(
        select(models.InfluencerProfile)
        .options(selectinload(models.InfluencerProfile.services))
        .filter(models.InfluencerProfile.user_id == current_user.id)
    )
    db_profile = result.scalars().first()

    if db_profile:
        for key, value in profile_data.model_dump().items():
            setattr(db_profile, key, value)
    else:
        db_profile = models.InfluencerProfile(**profile_data.model_dump(), user_id=current_user.id)
        db.add(db_profile)

    await db.commit()
    # Reload with services eagerly loaded
    result2 = await db.execute(
        select(models.InfluencerProfile)
        .options(selectinload(models.InfluencerProfile.services))
        .filter(models.InfluencerProfile.user_id == current_user.id)
    )
    return result2.scalars().first()


@router.get("/profile", response_model=schemas.InfluencerProfile)
async def get_my_profile(
    db: AsyncSession = db_dependency,
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role != models.UserRole.INFLUENCER:
        raise HTTPException(status_code=403, detail="Only influencers can view their profile.")
    result = await db.execute(
        select(models.InfluencerProfile)
        .options(selectinload(models.InfluencerProfile.services))
        .filter(models.InfluencerProfile.user_id == current_user.id)
    )
    profile = result.scalars().first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found. Please create one.")
    return profile


@router.post("/services", response_model=schemas.EngagementService, status_code=status.HTTP_201_CREATED)
async def create_engagement_service(
    service_data: schemas.EngagementServiceCreate,
    db: AsyncSession = db_dependency,
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role != models.UserRole.INFLUENCER:
        raise HTTPException(status_code=403, detail="Only influencers can create services.")

    result = await db.execute(
        select(models.InfluencerProfile).filter(models.InfluencerProfile.user_id == current_user.id)
    )
    profile = result.scalars().first()
    if not profile:
        raise HTTPException(status_code=404, detail="Create your profile first.")

    db_service = models.EngagementService(**service_data.model_dump(), influencer_id=profile.id)
    db.add(db_service)
    await db.commit()
    await db.refresh(db_service)
    return db_service


@router.delete("/services/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_engagement_service(
    service_id: int,
    db: AsyncSession = db_dependency,
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role != models.UserRole.INFLUENCER:
        raise HTTPException(status_code=403, detail="Only influencers can delete services.")
    result = await db.execute(
        select(models.EngagementService)
        .join(models.InfluencerProfile)
        .filter(
            models.EngagementService.id == service_id,
            models.InfluencerProfile.user_id == current_user.id
        )
    )
    service = result.scalars().first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found.")
    await db.delete(service)
    await db.commit()


@router.get("/services", response_model=List[schemas.EngagementService])
async def get_my_engagement_services(
    db: AsyncSession = db_dependency,
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role != models.UserRole.INFLUENCER:
        raise HTTPException(status_code=403, detail="Only influencers can view their services.")
    result = await db.execute(
        select(models.InfluencerProfile)
        .options(selectinload(models.InfluencerProfile.services))
        .filter(models.InfluencerProfile.user_id == current_user.id)
    )
    profile = result.scalars().first()
    return profile.services if profile else []
