from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool
from sqlalchemy import text, event
from dotenv import load_dotenv
import os

load_dotenv()

Base = declarative_base()

ASYNC_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./local_dev.db")

_is_postgres = ASYNC_DATABASE_URL.startswith("postgresql")

if _is_postgres:
    # Supabase transaction pooler requires no prepared statements and no connection pooling
    async_engine = create_async_engine(
        ASYNC_DATABASE_URL,
        echo=False,
        poolclass=NullPool,
        connect_args={"statement_cache_size": 0, "prepared_statement_cache_size": 0},
    )
else:
    async_engine = create_async_engine(ASYNC_DATABASE_URL, echo=False)

AsyncSessionLocal = sessionmaker(
    bind=async_engine, class_=AsyncSession, expire_on_commit=False
)


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
