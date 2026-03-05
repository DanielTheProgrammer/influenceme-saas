import models, schemas, database, auth

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.future import select
from typing import List

router = APIRouter(
    prefix="/influencers",
    tags=["influencers"],
    dependencies=[Depends(auth.get_current_active_user)]
)

db_dependency = Depends(database.get_db)


@router.post("/profile", response_model=schemas.InfluencerProfile)
def create_or_update_influencer_profile(
    profile_data: schemas.InfluencerProfileCreate,
    db: Session = db_dependency,
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role != models.UserRole.INFLUENCER:
        raise HTTPException(status_code=403, detail="Only influencers can manage profiles.")

    db_profile = db.execute(
        select(models.InfluencerProfile)
        .options(selectinload(models.InfluencerProfile.services))
        .filter(models.InfluencerProfile.user_id == current_user.id)
    ).scalars().first()

    if db_profile:
        for key, value in profile_data.model_dump().items():
            setattr(db_profile, key, value)
    else:
        db_profile = models.InfluencerProfile(**profile_data.model_dump(), user_id=current_user.id)
        db.add(db_profile)

    db.commit()
    return db.execute(
        select(models.InfluencerProfile)
        .options(selectinload(models.InfluencerProfile.services))
        .filter(models.InfluencerProfile.user_id == current_user.id)
    ).scalars().first()


@router.get("/profile", response_model=schemas.InfluencerProfile)
def get_my_profile(
    db: Session = db_dependency,
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role != models.UserRole.INFLUENCER:
        raise HTTPException(status_code=403, detail="Only influencers can view their profile.")
    profile = db.execute(
        select(models.InfluencerProfile)
        .options(selectinload(models.InfluencerProfile.services))
        .filter(models.InfluencerProfile.user_id == current_user.id)
    ).scalars().first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found. Please create one.")
    return profile


@router.post("/services", response_model=schemas.EngagementService, status_code=status.HTTP_201_CREATED)
def create_engagement_service(
    service_data: schemas.EngagementServiceCreate,
    db: Session = db_dependency,
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role != models.UserRole.INFLUENCER:
        raise HTTPException(status_code=403, detail="Only influencers can create services.")

    profile = db.execute(
        select(models.InfluencerProfile).filter(models.InfluencerProfile.user_id == current_user.id)
    ).scalars().first()
    if not profile:
        raise HTTPException(status_code=404, detail="Create your profile first.")

    db_service = models.EngagementService(**service_data.model_dump(), influencer_id=profile.id)
    db.add(db_service)
    db.commit()
    db.refresh(db_service)
    return db_service


@router.delete("/services/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_engagement_service(
    service_id: int,
    db: Session = db_dependency,
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role != models.UserRole.INFLUENCER:
        raise HTTPException(status_code=403, detail="Only influencers can delete services.")
    service = db.execute(
        select(models.EngagementService)
        .join(models.InfluencerProfile)
        .filter(
            models.EngagementService.id == service_id,
            models.InfluencerProfile.user_id == current_user.id
        )
    ).scalars().first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found.")
    db.delete(service)
    db.commit()


@router.get("/services", response_model=List[schemas.EngagementService])
def get_my_engagement_services(
    db: Session = db_dependency,
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role != models.UserRole.INFLUENCER:
        raise HTTPException(status_code=403, detail="Only influencers can view their services.")
    profile = db.execute(
        select(models.InfluencerProfile)
        .options(selectinload(models.InfluencerProfile.services))
        .filter(models.InfluencerProfile.user_id == current_user.id)
    ).scalars().first()
    return profile.services if profile else []
