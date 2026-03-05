import models, schemas, database, auth
from routers import marketplace, genai, influencer, influencers, dashboard, payments

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.future import select
from sqlalchemy import text
from datetime import timedelta
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI(
    title="Influencer Engagement SaaS",
    description="A marketplace for fans to purchase engagements from influencers.",
    version="0.1.0"
)

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    try:
        database.Base.metadata.create_all(database.engine)
    except Exception as e:
        print(f"[startup] WARNING: Could not create tables: {e}")


@app.get("/")
def read_root():
    return {"message": "Welcome to the Influencer Engagement Platform API"}


@app.get("/health")
def health_check():
    db_url = os.getenv("DATABASE_URL", "NOT SET")
    safe_url = db_url.split("@")[-1] if "@" in db_url else db_url
    try:
        with database.engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ok", "db": safe_url}
    except Exception as e:
        return {"status": "error", "db": safe_url, "detail": str(e), "type": type(e).__name__, "driver": database.DATABASE_URL.split("://")[0]}


@app.post("/token", response_model=schemas.Token)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(database.get_db)
):
    user = db.execute(select(models.User).filter(models.User.email == form_data.username)).scalars().first()
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
def register_user(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    if db.execute(select(models.User).filter(models.User.email == user.email)).scalars().first():
        raise HTTPException(status_code=400, detail="Email already registered")

    db_user = models.User(
        email=user.email,
        hashed_password=auth.get_password_hash(user.password),
        role=user.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@app.get("/users/me/", response_model=schemas.User)
def read_users_me(current_user: models.User = Depends(auth.get_current_active_user)):
    return current_user


app.include_router(marketplace.router)
app.include_router(genai.router)
app.include_router(influencer.router)
app.include_router(influencers.router)
app.include_router(dashboard.router)
app.include_router(payments.router)
