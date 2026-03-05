from models import UserRole, EngagementType, RequestStatus

from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None


class UserBase(BaseModel):
    email: EmailStr
    role: UserRole


class UserCreate(UserBase):
    password: str


class User(UserBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True


class EngagementServiceBase(BaseModel):
    engagement_type: EngagementType
    price: float
    description: Optional[str] = None
    duration_days: Optional[int] = None
    is_active: bool = True


class EngagementServiceCreate(EngagementServiceBase):
    pass


class EngagementService(EngagementServiceBase):
    id: int
    influencer_id: int

    class Config:
        from_attributes = True


class InfluencerProfileBase(BaseModel):
    display_name: str
    bio: Optional[str] = None
    instagram_handle: Optional[str] = None
    tiktok_handle: Optional[str] = None
    profile_picture_url: Optional[str] = None


class InfluencerProfileCreate(InfluencerProfileBase):
    pass


class InfluencerProfile(InfluencerProfileBase):
    id: int
    user_id: int
    services: List[EngagementService] = []
    verification_code: Optional[str] = None
    instagram_verification_status: str = "unverified"
    tiktok_verification_status: str = "unverified"

    class Config:
        from_attributes = True


class EngagementRequestBase(BaseModel):
    service_id: int
    generated_image_preview_url: Optional[str] = None


class EngagementRequestCreate(EngagementRequestBase):
    payment_intent_id: Optional[str] = None


class EngagementRequest(EngagementRequestBase):
    id: int
    fan_id: int
    status: RequestStatus
    created_at: datetime
    updated_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    counter_offer_price: Optional[float] = None
    counter_offer_description: Optional[str] = None
    service: Optional[EngagementService] = None

    class Config:
        from_attributes = True


class RejectRequest(BaseModel):
    rejection_reason: str


class CounterOfferRequest(BaseModel):
    new_price: float
    new_description: str


class AcceptCounterOffer(BaseModel):
    pass


class FulfillRequest(BaseModel):
    final_image_url: Optional[str] = None
