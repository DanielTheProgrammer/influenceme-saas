"""Shared fixtures for backend tests."""
import sys
import os
import asyncio
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

# Ensure backend directory is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Use in-memory SQLite for tests
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-unit-tests-only")

import database
from main import app
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"
test_engine = create_async_engine(TEST_DB_URL, echo=False)
TestSessionLocal = sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


async def override_get_db():
    async with TestSessionLocal() as session:
        yield session


app.dependency_overrides[database.get_db] = override_get_db


@pytest.fixture(scope="session")
def event_loop():
    """Use a single event loop for the entire test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session", autouse=True)
async def create_tables():
    """Create all tables in the test database once per session."""
    async with test_engine.begin() as conn:
        await conn.run_sync(database.Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(database.Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def fan_token(client: AsyncClient):
    """Register and log in a fan user, return JWT token."""
    email = "testfan@example.com"
    password = "testpassword123"
    await client.post("/auth/register", json={"email": email, "password": password, "role": "fan"})
    res = await client.post("/token", data={"username": email, "password": password})
    return res.json()["access_token"]


@pytest_asyncio.fixture
async def influencer_token(client: AsyncClient):
    """Register and log in an influencer user, return JWT token."""
    email = "testinfluencer@example.com"
    password = "testpassword123"
    await client.post("/auth/register", json={"email": email, "password": password, "role": "influencer"})
    res = await client.post("/token", data={"username": email, "password": password})
    return res.json()["access_token"]
