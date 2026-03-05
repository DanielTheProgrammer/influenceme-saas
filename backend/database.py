from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import text
from dotenv import load_dotenv
import os

load_dotenv()

# Define the declarative base
Base = declarative_base()

ASYNC_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./local_dev.db")

# statement_cache_size=0 required for Supabase transaction pooler (port 6543)
_connect_args = {"statement_cache_size": 0} if "pooler.supabase.com" in ASYNC_DATABASE_URL else {}
async_engine = create_async_engine(ASYNC_DATABASE_URL, echo=False, connect_args=_connect_args)
AsyncSessionLocal = sessionmaker(
    bind=async_engine, class_=AsyncSession, expire_on_commit=False
)


async def get_db() -> AsyncSession:
    """Dependency to get an async database session."""
    async with AsyncSessionLocal() as session:
        yield session
