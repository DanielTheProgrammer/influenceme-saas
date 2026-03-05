import models, schemas, database, auth
from routers import marketplace, genai, influencer, influencers, dashboard, payments

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import timedelta
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI(
    title="Influencer Engagement SaaS",
    description="A marketplace for fans to purchase engagements from influencers.",
    version="0.1.0"
)

# Configure CORS — allow localhost dev + Vercel production frontend
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    try:
        async with database.async_engine.begin() as conn:
            await conn.run_sync(database.Base.metadata.create_all)
    except Exception as e:
        print(f"[startup] WARNING: Could not create tables: {e}")


@app.get("/")
def read_root():
    return {"message": "Welcome to the Influencer Engagement Platform API"}


@app.get("/health")
async def health_check():
    db_url = os.getenv("DATABASE_URL", "NOT SET")
    # Mask password in URL for safety
    safe_url = db_url.split("@")[-1] if "@" in db_url else db_url
    try:
        async with database.async_engine.begin() as conn:
            from sqlalchemy import text
        await conn.execute(text("SELECT 1"))
        return {"status": "ok", "db": safe_url}
    except Exception as e:
        return {"status": "error", "db": safe_url, "detail": str(e)}


# --- Authentication ---

@app.post("/token", response_model=schemas.Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(database.get_db)
):
    result = await db.execute(select(models.User).filter(models.User.email == form_data.username))
    user = result.scalars().first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/auth/register", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
async def register_user(user: schemas.UserCreate, db: AsyncSession = Depends(database.get_db)):
    result = await db.execute(select(models.User).filter(models.User.email == user.email))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Email already registered")

    db_user = models.User(
        email=user.email,
        hashed_password=auth.get_password_hash(user.password),
        role=user.role
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user


@app.get("/users/me/", response_model=schemas.User)
async def read_users_me(current_user: models.User = Depends(auth.get_current_active_user)):
    return current_user


# --- Routers ---
app.include_router(marketplace.router)
app.include_router(genai.router)
app.include_router(influencer.router)
app.include_router(influencers.router)
app.include_router(dashboard.router)
app.include_router(payments.router)
