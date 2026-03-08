import models, schemas, database, auth

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.future import select
from dotenv import load_dotenv
import os

load_dotenv()

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
PLATFORM_FEE_PERCENT = int(os.getenv("PLATFORM_FEE_PERCENT", "20"))

router = APIRouter(prefix="/payments", tags=["payments"])
db_dependency = Depends(database.get_db)


class PaymentIntentRequest(BaseModel):
    request_id: int


class PaymentIntentResponse(BaseModel):
    client_secret: str
    amount: int


def get_stripe():
    if STRIPE_SECRET_KEY and not STRIPE_SECRET_KEY.startswith("YOUR_"):
        import stripe
        stripe.api_key = STRIPE_SECRET_KEY
        return stripe
    return None


@router.post("/create-payment-intent", response_model=PaymentIntentResponse)
def create_payment_intent(
    req: PaymentIntentRequest,
    db: Session = db_dependency,
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role != models.UserRole.FAN:
        raise HTTPException(status_code=403, detail="Only fans can create payment intents.")

    db_request = db.execute(
        select(models.EngagementRequest).filter(models.EngagementRequest.id == req.request_id)
    ).scalars().first()
    if not db_request or db_request.fan_id != current_user.id:
        raise HTTPException(status_code=404, detail="Engagement request not found.")
    if db_request.status != models.RequestStatus.PENDING:
        raise HTTPException(status_code=400, detail="Can only pay for pending requests.")

    service = db.execute(
        select(models.EngagementService).filter(models.EngagementService.id == db_request.service_id)
    ).scalars().first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found.")

    base_amount = int(service.price * 100)
    platform_fee = int(base_amount * PLATFORM_FEE_PERCENT / 100)
    total_amount = base_amount + platform_fee

    stripe = get_stripe()
    if stripe:
        try:
            intent = stripe.PaymentIntent.create(
                amount=total_amount,
                currency="usd",
                capture_method="manual",  # authorize only — capture on deal completion
                metadata={"request_id": db_request.id, "fan_id": current_user.id, "platform_fee": platform_fee}
            )
            db_request.payment_intent_id = intent.id
            db.commit()
            return PaymentIntentResponse(client_secret=intent.client_secret, amount=total_amount)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Stripe error: {str(e)}")
    else:
        mock_secret = f"pi_mock_{db_request.id}_secret_dev"
        return PaymentIntentResponse(client_secret=mock_secret, amount=total_amount)


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(database.get_db)):
    """Keep async to read raw body for Stripe signature verification."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    stripe = get_stripe()

    if stripe and STRIPE_WEBHOOK_SECRET:
        try:
            event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

        if event["type"] == "payment_intent.succeeded":
            pi = event["data"]["object"]
            request_id = pi.get("metadata", {}).get("request_id")
            if request_id:
                db_request = db.execute(
                    select(models.EngagementRequest).filter(models.EngagementRequest.id == int(request_id))
                ).scalars().first()
                if db_request and db_request.status == models.RequestStatus.PENDING:
                    db_request.payment_intent_id = pi["id"]
                    db.commit()

        elif event["type"] == "payment_intent.payment_failed":
            pi = event["data"]["object"]
            request_id = pi.get("metadata", {}).get("request_id")
            if request_id:
                db_request = db.execute(
                    select(models.EngagementRequest).filter(models.EngagementRequest.id == int(request_id))
                ).scalars().first()
                if db_request:
                    db_request.status = models.RequestStatus.CANCELLED
                    db.commit()

    return {"status": "ok"}
