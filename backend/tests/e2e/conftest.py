"""
Playwright E2E test configuration.

Requires both servers running:
  Frontend:  cd frontend && npm run build && npm start   (http://localhost:3000)
  Backend:   cd backend && uvicorn main:app              (http://localhost:8000)

Run:
  pytest tests/e2e/ -m e2e            # headless
  pytest tests/e2e/ -m e2e --headed   # visible browser
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import uuid
import requests as req_lib
import pytest
from helpers import FRONTEND, API


@pytest.fixture(scope="session")
def base_url():
    return FRONTEND


def _api(method: str, path: str, **kwargs):
    return req_lib.request(method, f"{API}{path}", **kwargs)


@pytest.fixture(scope="session")
def seeded_influencer():
    """
    Creates one influencer user with a profile and a service via the API.
    Session-scoped so it only runs once per test session.
    Returns a dict with email, password, profile info, and service id.
    """
    uid = uuid.uuid4().hex[:8]
    email = f"e2e_seed_{uid}@example.com"
    password = "seed_pass1"

    # Register
    reg = _api("POST", "/auth/register", json={"email": email, "password": password, "role": "influencer"})
    if reg.status_code not in (200, 201):
        pytest.skip(f"Could not seed influencer (register): {reg.text}")

    # Login
    tok = _api("POST", "/token", data={"username": email, "password": password})
    if not tok.ok:
        pytest.skip(f"Could not seed influencer (login): {tok.text}")
    token = tok.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create profile
    prof = _api("POST", "/influencers/profile", headers=headers, json={
        "display_name": f"E2E Influencer {uid}",
        "bio": "Seeded by Playwright E2E tests",
        "instagram_handle": f"e2e_{uid}",
        "tiktok_handle": None,
        "profile_picture_url": "https://i.pravatar.cc/150?u=e2e",
    })
    if not prof.ok:
        pytest.skip(f"Could not seed influencer profile: {prof.text}")

    # Add a service
    svc = _api("POST", "/influencers/services", headers=headers, json={
        "engagement_type": "story_tag",
        "price": 25.00,
        "description": "E2E test service",
        "duration_days": 1,
        "is_active": True,
    })

    profile = prof.json()
    return {
        "email": email,
        "password": password,
        "token": token,
        "influencer_id": profile.get("id"),
        "display_name": profile.get("display_name"),
        "service_id": svc.json().get("id") if svc.ok else None,
    }
