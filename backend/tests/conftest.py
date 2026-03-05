"""Shared fixtures for backend tests."""
import sys
import os
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ["DATABASE_URL"] = "sqlite:///./test.db"
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-unit-tests-only")

import database
from main import app
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

TEST_DB_URL = "sqlite:///./test.db"
test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestSessionLocal = sessionmaker(bind=test_engine, autoflush=False, autocommit=False)


def override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[database.get_db] = override_get_db


@pytest.fixture(scope="session", autouse=True)
def create_tables():
    database.Base.metadata.create_all(test_engine)
    yield
    database.Base.metadata.drop_all(test_engine)
    if os.path.exists("./test.db"):
        os.remove("./test.db")


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def fan_token(client):
    email = "testfan@example.com"
    password = "testpassword123"
    client.post("/auth/register", json={"email": email, "password": password, "role": "fan"})
    res = client.post("/token", data={"username": email, "password": password})
    return res.json()["access_token"]


@pytest.fixture
def influencer_token(client):
    email = "testinfluencer@example.com"
    password = "testpassword123"
    client.post("/auth/register", json={"email": email, "password": password, "role": "influencer"})
    res = client.post("/token", data={"username": email, "password": password})
    return res.json()["access_token"]
