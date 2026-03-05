from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool
from dotenv import load_dotenv
import os

load_dotenv()

Base = declarative_base()

_raw_url = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./local_dev.db")

# Normalize to psycopg3 driver URL.
# psycopg3 with prepared_threshold=None is officially compatible with
# pgbouncer transaction mode (port 6543) — no named prepared statements.
if _raw_url.startswith("postgresql+asyncpg://"):
    ASYNC_DATABASE_URL = _raw_url.replace("postgresql+asyncpg://", "postgresql+psycopg://", 1)
elif _raw_url.startswith("postgresql://"):
    ASYNC_DATABASE_URL = _raw_url.replace("postgresql://", "postgresql+psycopg://", 1)
else:
    ASYNC_DATABASE_URL = _raw_url

_is_postgres = ASYNC_DATABASE_URL.startswith("postgresql")

if _is_postgres:
    # NullPool for serverless (no persistent connections across invocations).
    # prepared_threshold=None disables prepared statements → pgbouncer transaction
    # mode compatible.
    async_engine = create_async_engine(
        ASYNC_DATABASE_URL,
        echo=False,
        poolclass=NullPool,
        connect_args={"prepared_threshold": None},
    )
else:
    async_engine = create_async_engine(ASYNC_DATABASE_URL, echo=False)

AsyncSessionLocal = sessionmaker(
    bind=async_engine, class_=AsyncSession, expire_on_commit=False
)


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
