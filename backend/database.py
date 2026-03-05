from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool
from sqlalchemy import text
from dotenv import load_dotenv
import os

load_dotenv()

Base = declarative_base()

ASYNC_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./local_dev.db")

if ASYNC_DATABASE_URL.startswith("postgresql"):
    import asyncpg as _asyncpg

    # Build the raw asyncpg URL (without the +asyncpg dialect prefix)
    _asyncpg_dsn = ASYNC_DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://").replace("postgresql://", "postgresql://")

    async def _async_creator():
        """Create asyncpg connection with prepared statements disabled (required for Supabase transaction pooler)."""
        return await _asyncpg.connect(_asyncpg_dsn, statement_cache_size=0)

    async_engine = create_async_engine(
        "postgresql+asyncpg://",  # placeholder — actual connection via async_creator
        async_creator=_async_creator,
        poolclass=NullPool,
    )
else:
    async_engine = create_async_engine(ASYNC_DATABASE_URL, echo=False)

AsyncSessionLocal = sessionmaker(
    bind=async_engine, class_=AsyncSession, expire_on_commit=False
)


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
