"""Tests for authentication endpoints."""
import pytest


def test_register_fan(client):
    res = client.post("/auth/register", json={
        "email": "newfan@example.com",
        "password": "securepass123",
        "role": "fan",
    })
    assert res.status_code == 201
    data = res.json()
    assert data["email"] == "newfan@example.com"
    assert data["role"] == "fan"
    assert "hashed_password" not in data


def test_register_influencer(client):
    res = client.post("/auth/register", json={
        "email": "newinfluencer@example.com",
        "password": "securepass123",
        "role": "influencer",
    })
    assert res.status_code == 201
    assert res.json()["role"] == "influencer"


def test_register_duplicate_email(client):
    payload = {"email": "dup@example.com", "password": "pass1234", "role": "fan"}
    client.post("/auth/register", json=payload)
    res = client.post("/auth/register", json=payload)
    assert res.status_code == 400


def test_login_success(client):
    email = "logintest@example.com"
    password = "loginpass123"
    client.post("/auth/register", json={"email": email, "password": password, "role": "fan"})
    res = client.post("/token", data={"username": email, "password": password})
    assert res.status_code == 200
    assert "access_token" in res.json()
    assert res.json()["token_type"] == "bearer"


def test_login_wrong_password(client):
    email = "wrongpass@example.com"
    client.post("/auth/register", json={"email": email, "password": "correct", "role": "fan"})
    res = client.post("/token", data={"username": email, "password": "wrong"})
    assert res.status_code == 401


def test_protected_endpoint_without_token(client):
    res = client.get("/influencer/requests")
    assert res.status_code == 401


def test_protected_endpoint_with_token(client, influencer_token):
    res = client.get("/influencer/requests", headers={"Authorization": f"Bearer {influencer_token}"})
    assert res.status_code in (200, 404)
