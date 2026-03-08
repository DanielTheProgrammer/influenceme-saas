
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    Boolean,
    ForeignKey,
    Enum as SQLAlchemyEnum,
    JSON,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from database import Base


class UserRole(enum.Enum):
    FAN = "fan"
    INFLUENCER = "influencer"


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(SQLAlchemyEnum(UserRole), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)

    # Relationships
    influencer_profile = relationship("InfluencerProfile", back_populates="user", uselist=False)
    fan_requests = relationship("EngagementRequest", back_populates="fan")


class InfluencerProfile(Base):
    __tablename__ = "influencer_profiles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    display_name = Column(String, index=True)
    bio = Column(String)
    instagram_handle = Column(String, unique=True)
    tiktok_handle = Column(String, unique=True)
    profile_picture_url = Column(String)
    stripe_account_id = Column(String, nullable=True)
    stripe_onboarding_complete = Column(Boolean, default=False)
    subscription_tier = Column(String, nullable=True)
    subscription_status = Column(String, nullable=True)

    # Audience & content
    followers_count = Column(Integer, nullable=True)
    recent_post_urls = Column(JSON, nullable=True)  # List[str] of image URLs
    viral_video_url = Column(String, nullable=True)  # TikTok/Instagram video URL for card background

    # Social verification
    verification_code = Column(String, nullable=True)
    instagram_verification_status = Column(String, default="unverified")  # unverified | pending | verified
    tiktok_verification_status = Column(String, default="unverified")

    # Admin approval — new registrations start unapproved until admin reviews
    is_approved = Column(Boolean, default=False, nullable=False)

    # Relationships
    user = relationship("User", back_populates="influencer_profile")
    services = relationship("EngagementService", back_populates="influencer")


class EngagementType(enum.Enum):
    PERMANENT_FOLLOW = "permanent_follow"
    TIMED_FOLLOW = "timed_follow"
    STORY_TAG = "story_tag"
    STORY_HIGHLIGHT = "story_highlight"
    POST_TAG = "post_tag"
    COMMENT = "comment"


class EngagementService(Base):
    __tablename__ = "engagement_services"
    id = Column(Integer, primary_key=True, index=True)
    influencer_id = Column(Integer, ForeignKey("influencer_profiles.id"), nullable=False)
    engagement_type = Column(SQLAlchemyEnum(EngagementType), nullable=False)
    price = Column(Float, nullable=False)
    description = Column(String)
    duration_days = Column(Integer, nullable=True)  # For timed engagements
    is_active = Column(Boolean, default=True)

    # Relationships
    influencer = relationship("InfluencerProfile", back_populates="services")


class RequestStatus(enum.Enum):
    PENDING = "pending"          # Fan has submitted, awaiting influencer approval
    APPROVED = "approved"        # Influencer has approved, awaiting fulfillment
    REJECTED = "rejected"        # Influencer has rejected
    FULFILLED = "fulfilled"      # Influencer claims fulfillment, awaiting verification
    VERIFIED = "verified"        # Platform has verified, payment released
    DISPUTED = "disputed"        # Verification failed, needs manual review
    CANCELLED = "cancelled"      # Fan cancelled before approval
    COUNTER_OFFERED = "counter_offered" # Influencer has made a counter-offer


class EngagementRequest(Base):
    __tablename__ = "engagement_requests"
    id = Column(Integer, primary_key=True, index=True)
    fan_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    service_id = Column(Integer, ForeignKey("engagement_services.id"), nullable=False)
    status = Column(SQLAlchemyEnum(RequestStatus), default=RequestStatus.PENDING, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Payment & GenAI details
    payment_intent_id = Column(String) # From Stripe
    generated_image_preview_url = Column(String) # Watermarked
    generated_image_final_url = Column(String) # Un-watermarked, for influencer
    proof_url = Column(String, nullable=True)            # URL to fulfillment proof (post/story link)
    proof_screenshot_url = Column(String, nullable=True) # Screenshot URL uploaded by influencer
    rejection_reason = Column(String, nullable=True)
    counter_offer_price = Column(Float, nullable=True)
    counter_offer_description = Column(String, nullable=True)
    fulfilled_at = Column(DateTime(timezone=True), nullable=True)  # When influencer marked fulfilled
    dispute_reason = Column(String, nullable=True)                 # Fan's reason if disputed
    
    # Relationships
    fan = relationship("User", back_populates="fan_requests")
    service = relationship("EngagementService")

