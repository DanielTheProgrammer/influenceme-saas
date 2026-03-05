"""Tests for influencer-side endpoints."""
import pytest


def test_fan_cannot_access_influencer_routes(client, fan_token):
    res = client.get("/influencer/requests", headers={"Authorization": f"Bearer {fan_token}"})
    assert res.status_code == 403


def test_create_and_get_profile(client, influencer_token):
    auth = {"Authorization": f"Bearer {influencer_token}"}
    res = client.post("/influencers/profile", headers=auth, json={
        "display_name": "My Profile",
        "bio": "Test bio",
        "instagram_handle": "@myprofile_test",
        "tiktok_handle": None,
        "profile_picture_url": None,
    })
    assert res.status_code == 200
    assert res.json()["display_name"] == "My Profile"
    assert isinstance(res.json()["services"], list)


def test_add_and_delete_service(client, influencer_token):
    auth = {"Authorization": f"Bearer {influencer_token}"}

    client.post("/influencers/profile", headers=auth, json={
        "display_name": "Service Test",
        "bio": None,
        "instagram_handle": "@svc_test_handle",
        "tiktok_handle": None,
        "profile_picture_url": None,
    })

    add_res = client.post("/influencers/services", headers=auth, json={
        "engagement_type": "comment",
        "price": 5.00,
        "description": "Leave a nice comment",
        "duration_days": None,
    })
    assert add_res.status_code == 201
    service_id = add_res.json()["id"]

    list_res = client.get("/influencers/services", headers=auth)
    assert any(s["id"] == service_id for s in list_res.json())

    del_res = client.delete(f"/influencers/services/{service_id}", headers=auth)
    assert del_res.status_code == 204

    list_res2 = client.get("/influencers/services", headers=auth)
    assert not any(s["id"] == service_id for s in list_res2.json())


def test_reject_request(client, influencer_token, fan_token):
    auth_inf = {"Authorization": f"Bearer {influencer_token}"}
    auth_fan = {"Authorization": f"Bearer {fan_token}"}

    client.post("/influencers/profile", headers=auth_inf, json={
        "display_name": "Reject Test Inf",
        "bio": None,
        "instagram_handle": "@rejecttest_handle",
        "tiktok_handle": None,
        "profile_picture_url": None,
    })
    svc_res = client.post("/influencers/services", headers=auth_inf, json={
        "engagement_type": "permanent_follow",
        "price": 20.00,
        "description": None,
        "duration_days": None,
    })
    service_id = svc_res.json()["id"]

    req_res = client.post("/marketplace/requests", headers=auth_fan, json={"service_id": service_id})
    request_id = req_res.json()["id"]

    rej_res = client.post(f"/influencer/requests/{request_id}/reject", headers=auth_inf, json={
        "rejection_reason": "Not a good fit.",
    })
    assert rej_res.status_code == 200
    assert rej_res.json()["status"] == "rejected"
    assert rej_res.json()["rejection_reason"] == "Not a good fit."


def test_counter_offer(client, influencer_token, fan_token):
    auth_inf = {"Authorization": f"Bearer {influencer_token}"}
    auth_fan = {"Authorization": f"Bearer {fan_token}"}

    client.post("/influencers/profile", headers=auth_inf, json={
        "display_name": "Counter Offer Inf",
        "bio": None,
        "instagram_handle": "@counter_offer_handle",
        "tiktok_handle": None,
        "profile_picture_url": None,
    })
    svc_res = client.post("/influencers/services", headers=auth_inf, json={
        "engagement_type": "story_highlight",
        "price": 50.00,
        "description": None,
        "duration_days": 30,
    })
    service_id = svc_res.json()["id"]

    req_res = client.post("/marketplace/requests", headers=auth_fan, json={"service_id": service_id})
    request_id = req_res.json()["id"]

    co_res = client.post(f"/influencer/requests/{request_id}/counter-offer", headers=auth_inf, json={
        "new_price": 35.00,
        "new_description": "I can do it for $35",
    })
    assert co_res.status_code == 200
    assert co_res.json()["status"] == "counter_offered"
    assert co_res.json()["counter_offer_price"] == 35.00

    accept_res = client.post(f"/marketplace/requests/{request_id}/accept-counter-offer", headers=auth_fan)
    assert accept_res.status_code == 200
    assert accept_res.json()["status"] in ("pending", "approved")
