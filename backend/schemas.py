from models import UserRole, EngagementType, RequestStatus

from pydantic import BaseModel, EmailStr, ConfigDict, field_validator
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

    @field_validator("password")
    @classmethod
    def password_complexity(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters.")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one number.")
        return v


class User(UserBase):
    id: int
    is_active: bool
    model_config = ConfigDict(from_attributes=True)


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
    model_config = ConfigDict(from_attributes=True)


class InfluencerProfileBase(BaseModel):
    display_name: str
    bio: Optional[str] = None
    instagram_handle: Optional[str] = None
    tiktok_handle: Optional[str] = None
    profile_picture_url: Optional[str] = None
    followers_count: Optional[int] = None
    recent_post_urls: Optional[List[str]] = None
    viral_video_url: Optional[str] = None


class InfluencerProfileCreate(InfluencerProfileBase):
    pass


class InfluencerProfile(InfluencerProfileBase):
    id: int
    user_id: int
    services: List[EngagementService] = []
    verification_code: Optional[str] = None
    instagram_verification_status: str = "unverified"
    tiktok_verification_status: str = "unverified"
    model_config = ConfigDict(from_attributes=True)


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
    proof_url: Optional[str] = None
    service: Optional[EngagementService] = None
    model_config = ConfigDict(from_attributes=True)


class RejectRequest(BaseModel):
    rejection_reason: str


class CounterOfferRequest(BaseModel):
    new_price: float
    new_description: str


class AcceptCounterOffer(BaseModel):
    pass


class FulfillRequest(BaseModel):
    proof_url: str
    final_image_url: Optional[str] = None
