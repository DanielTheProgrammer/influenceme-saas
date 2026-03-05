from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool
from sqlalchemy import text
from dotenv import load_dotenv
import os

load_dotenv()

Base = declarative_base()

_raw_url = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./local_dev.db")

# Normalize Postgres URLs to use psycopg (psycopg3) which works correctly
# with pgbouncer transaction mode (no named prepared statement conflicts).
# Accept any postgresql+asyncpg:// or postgresql:// prefix.
if _raw_url.startswith("postgresql+asyncpg://"):
    ASYNC_DATABASE_URL = _raw_url.replace("postgresql+asyncpg://", "postgresql+psycopg://", 1)
elif _raw_url.startswith("postgresql://"):
    ASYNC_DATABASE_URL = _raw_url.replace("postgresql://", "postgresql+psycopg://", 1)
else:
    ASYNC_DATABASE_URL = _raw_url

_is_postgres = ASYNC_DATABASE_URL.startswith("postgresql")

# Use NullPool for serverless (Vercel) — no persistent connections
async_engine = create_async_engine(
    ASYNC_DATABASE_URL,
    echo=False,
    poolclass=NullPool if _is_postgres else None,
)

AsyncSessionLocal = sessionmaker(
    bind=async_engine, class_=AsyncSession, expire_on_commit=False
)


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
