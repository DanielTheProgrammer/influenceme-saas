"""Tests for social verification endpoints."""


def _setup_influencer_with_handles(client, influencer_token):
    auth = {"Authorization": f"Bearer {influencer_token}"}
    res = client.post("/influencers/profile", headers=auth, json={
        "display_name": "Verify Test",
        "bio": None,
        "instagram_handle": "verifytest_ig",
        "tiktok_handle": "verifytest_tt",
        "profile_picture_url": None,
    })
    assert res.status_code == 200
    return res.json()


def test_profile_has_verification_code(client, influencer_token):
    profile = _setup_influencer_with_handles(client, influencer_token)
    assert profile["verification_code"] is not None
    assert profile["verification_code"].startswith("im-")
    assert profile["instagram_verification_status"] == "unverified"
    assert profile["tiktok_verification_status"] == "unverified"


def test_request_instagram_verification(client, influencer_token):
    _setup_influencer_with_handles(client, influencer_token)
    auth = {"Authorization": f"Bearer {influencer_token}"}

    res = client.post("/influencer/verification/request", headers=auth, json={"platform": "instagram"})
    assert res.status_code == 200
    assert res.json()["status"] == "pending"
    assert res.json()["platform"] == "instagram"

    profile_res = client.get("/influencers/profile", headers=auth)
    assert profile_res.json()["instagram_verification_status"] == "pending"
    assert profile_res.json()["tiktok_verification_status"] == "unverified"


def test_request_tiktok_verification(client, influencer_token):
    _setup_influencer_with_handles(client, influencer_token)
    auth = {"Authorization": f"Bearer {influencer_token}"}

    res = client.post("/influencer/verification/request", headers=auth, json={"platform": "tiktok"})
    assert res.status_code == 200
    assert res.json()["platform"] == "tiktok"

    profile_res = client.get("/influencers/profile", headers=auth)
    assert profile_res.json()["tiktok_verification_status"] == "pending"


def test_invalid_platform_rejected(client, influencer_token):
    _setup_influencer_with_handles(client, influencer_token)
    auth = {"Authorization": f"Bearer {influencer_token}"}

    res = client.post("/influencer/verification/request", headers=auth, json={"platform": "youtube"})
    assert res.status_code == 400


def test_fan_cannot_request_verification(client, fan_token):
    auth = {"Authorization": f"Bearer {fan_token}"}
    res = client.post("/influencer/verification/request", headers=auth, json={"platform": "instagram"})
    assert res.status_code == 403


def test_verification_requires_handle(client, influencer_token):
    auth = {"Authorization": f"Bearer {influencer_token}"}
    # Create profile with NO tiktok handle
    client.post("/influencers/profile", headers=auth, json={
        "display_name": "No TikTok",
        "bio": None,
        "instagram_handle": "notiktok_ig",
        "tiktok_handle": None,
        "profile_picture_url": None,
    })

    res = client.post("/influencer/verification/request", headers=auth, json={"platform": "tiktok"})
    assert res.status_code == 400
    assert "TikTok" in res.json()["detail"]
