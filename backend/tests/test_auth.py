"""Tests for authentication endpoints."""
import pytest


@pytest.mark.asyncio
async def test_register_fan(client):
    res = await client.post("/auth/register", json={
        "email": "newfan@example.com",
        "password": "securepass123",
        "role": "fan",
    })
    assert res.status_code == 201
    data = res.json()
    assert data["email"] == "newfan@example.com"
    assert data["role"] == "fan"
    assert "hashed_password" not in data


@pytest.mark.asyncio
async def test_register_influencer(client):
    res = await client.post("/auth/register", json={
        "email": "newinfluencer@example.com",
        "password": "securepass123",
        "role": "influencer",
    })
    assert res.status_code == 201
    assert res.json()["role"] == "influencer"


@pytest.mark.asyncio
async def test_register_duplicate_email(client):
    payload = {"email": "dup@example.com", "password": "pass123", "role": "fan"}
    await client.post("/auth/register", json=payload)
    res = await client.post("/auth/register", json=payload)
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_login_success(client):
    email = "logintest@example.com"
    password = "loginpass123"
    await client.post("/auth/register", json={"email": email, "password": password, "role": "fan"})
    res = await client.post("/token", data={"username": email, "password": password})
    assert res.status_code == 200
    assert "access_token" in res.json()
    assert res.json()["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    email = "wrongpass@example.com"
    await client.post("/auth/register", json={"email": email, "password": "correct", "role": "fan"})
    res = await client.post("/token", data={"username": email, "password": "wrong"})
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_protected_endpoint_without_token(client):
    res = await client.get("/influencer/requests")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_protected_endpoint_with_token(client, influencer_token):
    """Influencer can access their endpoint (even with no profile yet → returns empty list or 404)."""
    res = await client.get("/influencer/requests", headers={"Authorization": f"Bearer {influencer_token}"})
    # 200 (has profile) or 404 (no profile yet) — either way, not 401
    assert res.status_code in (200, 404)
