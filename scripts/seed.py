import asyncio
import os
import sys

# Ensure the script can import the backend module
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from database import engine, SessionLocal
import models
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession

# For the seed script, we'll use a synchronous session to make it simpler,
# since the main app is async but the db models themselves are agnostic.
from sqlalchemy import create_engine
sync_engine = create_engine("sqlite:///./backend/local_dev.db")
SyncSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sync_engine)

def seed_db():
    db = SyncSessionLocal()
    try:
        # Check if users exist
        user_count = db.query(models.User).count()
        if user_count > 0:
            print("Database already has data. Skipping seed.")
            return

        print("Seeding database with test influencers...")

        # Create Influencer 1
        inf1_user = models.User(email="alex@example.com", hashed_password="pw", role=models.UserRole.INFLUENCER)
        db.add(inf1_user)
        db.commit()
        db.refresh(inf1_user)

        inf1_profile = models.InfluencerProfile(
            user_id=inf1_user.id,
            display_name="Alex Vause",
            bio="Fashion & Lifestyle. Exploring the world one outfit at a time.",
            instagram_handle="@alexv_style",
            profile_picture_url="https://i.pravatar.cc/150?u=alex"
        )
        db.add(inf1_profile)
        db.commit()
        db.refresh(inf1_profile)

        # Add Services to Influencer 1
        db.add(models.EngagementService(influencer_id=inf1_profile.id, engagement_type=models.EngagementType.STORY_TAG, price=75.0, description="24h Story Tag"))
        db.add(models.EngagementService(influencer_id=inf1_profile.id, engagement_type=models.EngagementType.PERMANENT_FOLLOW, price=150.0))
        
        # Create a Fan User
        fan_user = models.User(email="fan@example.com", hashed_password="pw", role=models.UserRole.FAN)
        db.add(fan_user)
        db.commit()

        print("Database seeded successfully!")

    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
