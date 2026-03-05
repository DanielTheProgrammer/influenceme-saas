"""Tests for marketplace endpoints."""
import pytest


def test_browse_influencers_public(client):
    res = client.get("/marketplace/influencers")
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_submit_request_requires_auth(client):
    res = client.post("/marketplace/requests", json={"service_id": 999})
    assert res.status_code == 401


def test_fan_can_see_own_requests(client, fan_token):
    res = client.get("/marketplace/requests/my", headers={"Authorization": f"Bearer {fan_token}"})
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_influencer_full_flow(client, influencer_token, fan_token):
    auth_inf = {"Authorization": f"Bearer {influencer_token}"}
    auth_fan = {"Authorization": f"Bearer {fan_token}"}

    profile_res = client.post("/influencers/profile", headers=auth_inf, json={
        "display_name": "Test Influencer",
        "bio": "Test bio",
        "instagram_handle": "@testinf_flow",
        "tiktok_handle": None,
        "profile_picture_url": None,
    })
    assert profile_res.status_code == 200

    svc_res = client.post("/influencers/services", headers=auth_inf, json={
        "engagement_type": "story_tag",
        "price": 10.00,
        "description": "A story tag",
        "duration_days": None,
    })
    assert svc_res.status_code == 201
    service_id = svc_res.json()["id"]

    browse_res = client.get("/marketplace/influencers")
    assert any(inf.get("display_name") == "Test Influencer" for inf in browse_res.json())

    req_res = client.post("/marketplace/requests", headers=auth_fan, json={
        "service_id": service_id,
        "generated_image_preview_url": "https://example.com/preview.jpg",
    })
    assert req_res.status_code == 201
    request_id = req_res.json()["id"]
    assert req_res.json()["status"] == "pending"

    my_res = client.get("/marketplace/requests/my", headers=auth_fan)
    assert any(r["id"] == request_id for r in my_res.json())

    approve_res = client.post(f"/influencer/requests/{request_id}/approve", headers=auth_inf)
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == "approved"

    fulfill_res = client.post(f"/influencer/requests/{request_id}/fulfill", headers=auth_inf, json={
        "final_image_url": "https://example.com/final.jpg",
    })
    assert fulfill_res.status_code == 200
    assert fulfill_res.json()["status"] == "fulfilled"

    verify_res = client.post(f"/marketplace/requests/{request_id}/verify", headers=auth_fan)
    assert verify_res.status_code == 200
    assert verify_res.json()["status"] == "verified"
