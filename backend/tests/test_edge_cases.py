"""Edge case and permission boundary tests."""


def _create_influencer_with_service(client, token, handle_suffix=""):
    auth = {"Authorization": f"Bearer {token}"}
    client.post("/influencers/profile", headers=auth, json={
        "display_name": f"Edge Inf {handle_suffix}",
        "bio": None,
        "instagram_handle": f"edge_handle{handle_suffix}",
        "tiktok_handle": None,
        "profile_picture_url": None,
    })
    svc = client.post("/influencers/services", headers=auth, json={
        "engagement_type": "story_tag",
        "price": 15.00,
        "description": "Edge case service",
        "duration_days": None,
    })
    return svc.json()["id"]


# ── Request state machine ──────────────────────────────────────────────────

def test_cannot_approve_already_approved_request(client, influencer_token, fan_token):
    auth_inf = {"Authorization": f"Bearer {influencer_token}"}
    auth_fan = {"Authorization": f"Bearer {fan_token}"}
    svc_id = _create_influencer_with_service(client, influencer_token, "_approve")

    req_id = client.post("/marketplace/requests", headers=auth_fan, json={"service_id": svc_id}).json()["id"]
    client.post(f"/influencer/requests/{req_id}/approve", headers=auth_inf)

    # Try approving again
    res = client.post(f"/influencer/requests/{req_id}/approve", headers=auth_inf)
    assert res.status_code == 400


def test_cannot_reject_already_approved_request(client, influencer_token, fan_token):
    auth_inf = {"Authorization": f"Bearer {influencer_token}"}
    auth_fan = {"Authorization": f"Bearer {fan_token}"}
    svc_id = _create_influencer_with_service(client, influencer_token, "_reject_after_approve")

    req_id = client.post("/marketplace/requests", headers=auth_fan, json={"service_id": svc_id}).json()["id"]
    client.post(f"/influencer/requests/{req_id}/approve", headers=auth_inf)

    res = client.post(f"/influencer/requests/{req_id}/reject", headers=auth_inf, json={"rejection_reason": "too late"})
    assert res.status_code == 400


def test_cannot_fulfill_pending_request(client, influencer_token, fan_token):
    auth_inf = {"Authorization": f"Bearer {influencer_token}"}
    auth_fan = {"Authorization": f"Bearer {fan_token}"}
    svc_id = _create_influencer_with_service(client, influencer_token, "_fulfill_pending")

    req_id = client.post("/marketplace/requests", headers=auth_fan, json={"service_id": svc_id}).json()["id"]

    res = client.post(f"/influencer/requests/{req_id}/fulfill", headers=auth_inf, json={"final_image_url": None})
    assert res.status_code == 400


def test_cannot_verify_pending_request(client, influencer_token, fan_token):
    auth_inf = {"Authorization": f"Bearer {influencer_token}"}
    auth_fan = {"Authorization": f"Bearer {fan_token}"}
    svc_id = _create_influencer_with_service(client, influencer_token, "_verify_pending")

    req_id = client.post("/marketplace/requests", headers=auth_fan, json={"service_id": svc_id}).json()["id"]

    res = client.post(f"/marketplace/requests/{req_id}/verify", headers=auth_fan)
    assert res.status_code == 400


def test_counter_offer_decline_cancels_request(client, influencer_token, fan_token):
    auth_inf = {"Authorization": f"Bearer {influencer_token}"}
    auth_fan = {"Authorization": f"Bearer {fan_token}"}
    svc_id = _create_influencer_with_service(client, influencer_token, "_co_decline")

    req_id = client.post("/marketplace/requests", headers=auth_fan, json={"service_id": svc_id}).json()["id"]
    client.post(f"/influencer/requests/{req_id}/counter-offer", headers=auth_inf, json={
        "new_price": 25.00, "new_description": "Higher price"
    })

    res = client.post(f"/marketplace/requests/{req_id}/reject-counter-offer", headers=auth_fan)
    assert res.status_code == 200
    assert res.json()["status"] == "cancelled"


# ── Cross-user permission boundaries ──────────────────────────────────────

def test_influencer_cannot_approve_another_influencers_request(client, influencer_token, fan_token):
    """Register a second influencer and try to approve a request for the first one."""
    # Second influencer
    client.post("/auth/register", json={
        "email": "second_inf@example.com", "password": "pass123", "role": "influencer"
    })
    token2 = client.post("/token", data={
        "username": "second_inf@example.com", "password": "pass123"
    }).json()["access_token"]
    auth2 = {"Authorization": f"Bearer {token2}"}

    auth_inf = {"Authorization": f"Bearer {influencer_token}"}
    auth_fan = {"Authorization": f"Bearer {fan_token}"}
    svc_id = _create_influencer_with_service(client, influencer_token, "_cross_perm")

    req_id = client.post("/marketplace/requests", headers=auth_fan, json={"service_id": svc_id}).json()["id"]

    # Second influencer tries to approve it — must fail
    res = client.post(f"/influencer/requests/{req_id}/approve", headers=auth2)
    assert res.status_code in (403, 404)


def test_fan_cannot_approve_requests(client, fan_token, influencer_token):
    auth_inf = {"Authorization": f"Bearer {influencer_token}"}
    auth_fan = {"Authorization": f"Bearer {fan_token}"}
    svc_id = _create_influencer_with_service(client, influencer_token, "_fan_approve")

    req_id = client.post("/marketplace/requests", headers=auth_fan, json={"service_id": svc_id}).json()["id"]

    res = client.post(f"/influencer/requests/{req_id}/approve", headers=auth_fan)
    assert res.status_code == 403


def test_influencer_cannot_submit_request(client, influencer_token):
    auth = {"Authorization": f"Bearer {influencer_token}"}
    svc_id = _create_influencer_with_service(client, influencer_token, "_inf_submit")

    res = client.post("/marketplace/requests", headers=auth, json={"service_id": svc_id})
    assert res.status_code == 403


def test_fan_cannot_view_influencer_requests(client, fan_token):
    auth = {"Authorization": f"Bearer {fan_token}"}
    res = client.get("/influencer/requests", headers=auth)
    assert res.status_code == 403


# ── Service management ────────────────────────────────────────────────────

def test_cannot_delete_another_influencers_service(client, influencer_token, fan_token):
    # Register second influencer
    client.post("/auth/register", json={
        "email": "svc_intruder@example.com", "password": "pass123", "role": "influencer"
    })
    token2 = client.post("/token", data={
        "username": "svc_intruder@example.com", "password": "pass123"
    }).json()["access_token"]
    auth2 = {"Authorization": f"Bearer {token2}"}

    svc_id = _create_influencer_with_service(client, influencer_token, "_svc_del")

    res = client.delete(f"/influencers/services/{svc_id}", headers=auth2)
    assert res.status_code == 404


def test_service_requires_profile_first(client):
    client.post("/auth/register", json={
        "email": "noprofile@example.com", "password": "pass123", "role": "influencer"
    })
    token = client.post("/token", data={
        "username": "noprofile@example.com", "password": "pass123"
    }).json()["access_token"]
    auth = {"Authorization": f"Bearer {token}"}

    res = client.post("/influencers/services", headers=auth, json={
        "engagement_type": "comment", "price": 5.00, "description": None, "duration_days": None
    })
    assert res.status_code == 404


# ── Marketplace browse ─────────────────────────────────────────────────────

def test_get_nonexistent_influencer_returns_404(client):
    res = client.get("/marketplace/influencers/99999")
    assert res.status_code == 404


def test_request_inactive_service_rejected(client, influencer_token, fan_token):
    auth_inf = {"Authorization": f"Bearer {influencer_token}"}
    auth_fan = {"Authorization": f"Bearer {fan_token}"}

    _create_influencer_with_service(client, influencer_token, "_inactive")
    # Get service id — add an inactive one
    svc_res = client.post("/influencers/services", headers=auth_inf, json={
        "engagement_type": "comment",
        "price": 5.00,
        "description": None,
        "duration_days": None,
        "is_active": False,
    })
    svc_id = svc_res.json()["id"]

    res = client.post("/marketplace/requests", headers=auth_fan, json={"service_id": svc_id})
    assert res.status_code == 404
