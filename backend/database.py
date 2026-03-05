from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool
from sqlalchemy import text
from dotenv import load_dotenv
import os

load_dotenv()

# Define the declarative base
Base = declarative_base()

ASYNC_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./local_dev.db")

# NullPool for serverless (Vercel), statement_cache_size=0 for Supabase transaction pooler
_is_supabase_pooler = "pooler.supabase.com" in ASYNC_DATABASE_URL
_connect_args = {"statement_cache_size": 0} if _is_supabase_pooler else {}
_pool_class = NullPool if _is_supabase_pooler else None

async_engine = create_async_engine(
    ASYNC_DATABASE_URL,
    echo=False,
    connect_args=_connect_args,
    **( {"poolclass": NullPool} if _is_supabase_pooler else {} )
)
AsyncSessionLocal = sessionmaker(
    bind=async_engine, class_=AsyncSession, expire_on_commit=False
)


async def get_db() -> AsyncSession:
    """Dependency to get an async database session."""
    async with AsyncSessionLocal() as session:
        yield session
