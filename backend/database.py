from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from sqlalchemy.pool import NullPool
from dotenv import load_dotenv
import os

load_dotenv()

Base = declarative_base()

_raw_url = os.getenv("DATABASE_URL", "sqlite:///./local_dev.db")

# Normalize URL: strip async driver prefixes, use plain psycopg2 for Postgres.
# psycopg2 uses unnamed prepared statements → works with pgbouncer transaction mode.
if _raw_url.startswith("postgresql+asyncpg://"):
    DATABASE_URL = _raw_url.replace("postgresql+asyncpg://", "postgresql://", 1)
elif _raw_url.startswith("postgresql+psycopg://"):
    DATABASE_URL = _raw_url.replace("postgresql+psycopg://", "postgresql://", 1)
elif _raw_url.startswith("sqlite+aiosqlite://"):
    DATABASE_URL = _raw_url.replace("sqlite+aiosqlite://", "sqlite://", 1)
else:
    DATABASE_URL = _raw_url

_is_postgres = DATABASE_URL.startswith("postgresql")

engine = create_engine(
    DATABASE_URL,
    poolclass=NullPool if _is_postgres else None,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
