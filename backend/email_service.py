"""
Email notifications via Resend.
All functions are fire-and-forget — errors are caught and logged, never raised.
"""
import os
from dotenv import load_dotenv

load_dotenv()

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "Leaky <notifications@leaky.app>")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://influenceme-saas-7lt7.vercel.app")


def _send(to: str, subject: str, html: str) -> None:
    """Send an email via Resend. Silently ignores errors."""
    if not RESEND_API_KEY:
        print(f"[email] RESEND_API_KEY not set — skipping email to {to}: {subject}")
        return
    try:
        import resend
        resend.api_key = RESEND_API_KEY
        resend.Emails.send({
            "from": FROM_EMAIL,
            "to": [to],
            "subject": subject,
            "html": html,
        })
    except Exception as e:
        print(f"[email] Failed to send to {to}: {e}")


def _base(content: str) -> str:
    """Wrap content in a minimal dark-themed HTML shell matching Leaky brand."""
    return f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 16px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #222;border-radius:16px;overflow:hidden;max-width:520px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="padding:28px 32px 20px;border-bottom:1px solid #222;">
            <span style="font-size:22px;font-weight:900;color:#F0A500;letter-spacing:-0.04em;">LEAKY</span>
          </td>
        </tr>
        <!-- Content -->
        <tr><td style="padding:32px;">{content}</td></tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #1a1a1a;">
            <p style="margin:0;font-size:11px;color:#555;line-height:1.6;">
              You received this because you have an account on Leaky.<br>
              <a href="{FRONTEND_URL}" style="color:#F0A500;text-decoration:none;">leaky.app</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _btn(text: str, url: str, color: str = "#F0A500", text_color: str = "#0a0a0a") -> str:
    return f'<a href="{url}" style="display:inline-block;padding:12px 28px;background:{color};color:{text_color};font-weight:700;font-size:14px;border-radius:100px;text-decoration:none;margin-top:20px;">{text}</a>'


def _h(text: str) -> str:
    return f'<h2 style="margin:0 0 12px;font-size:20px;font-weight:800;color:#fff;letter-spacing:-0.02em;">{text}</h2>'


def _p(text: str, color: str = "#aaa") -> str:
    return f'<p style="margin:0 0 12px;font-size:14px;color:{color};line-height:1.7;">{text}</p>'


def _box(text: str, color: str = "#F0A500") -> str:
    return f'<div style="background:{color}18;border:1px solid {color}33;border-radius:10px;padding:14px 16px;margin:16px 0;font-size:13px;color:{color};line-height:1.6;">{text}</div>'


# ─────────────────────────────────────────────────────────────────────────────
# Specific email functions
# ─────────────────────────────────────────────────────────────────────────────

def notify_influencer_new_request(influencer_email: str, influencer_name: str, fan_id: int, service_type: str, price: float) -> None:
    content = (
        _h("New fan request 🔔") +
        _p(f"Hey {influencer_name}, a fan wants to book your <strong style='color:#fff;'>{service_type.replace('_',' ').title()}</strong> service.") +
        _box(f"💰 Price: <strong>${price:.2f}</strong><br>👤 Fan #{fan_id}") +
        _p("Log in to accept, reject, or make a counter-offer. You have 48 hours before it expires.", "#777") +
        _btn("Review Request →", f"{FRONTEND_URL}/dashboard")
    )
    _send(influencer_email, "New fan request on Leaky", _base(content))


def notify_fan_request_approved(fan_email: str, influencer_name: str) -> None:
    content = (
        _h("Request approved ✅") +
        _p(f"<strong style='color:#fff;'>{influencer_name}</strong> accepted your request and will get to work.") +
        _p("You'll be notified as soon as they mark it fulfilled. Your payment stays in escrow until you confirm.", "#777") +
        _btn("View My Requests →", f"{FRONTEND_URL}/fan/requests")
    )
    _send(fan_email, f"{influencer_name} accepted your request", _base(content))


def notify_fan_request_rejected(fan_email: str, influencer_name: str, reason: str | None) -> None:
    reason_block = _box(f"Their note: <em>{reason}</em>") if reason else ""
    content = (
        _h("Request not accepted") +
        _p(f"<strong style='color:#fff;'>{influencer_name}</strong> declined your request. Your card was <strong style='color:#00CDBE;'>not charged</strong> — the hold has been released.") +
        reason_block +
        _p("Browse other creators and try again.", "#777") +
        _btn("Browse Creators →", f"{FRONTEND_URL}/browse")
    )
    _send(fan_email, f"{influencer_name} declined your request", _base(content))


def notify_fan_counter_offer(fan_email: str, influencer_name: str, new_price: float, description: str | None) -> None:
    desc_line = f"<br>📝 Note: <em>{description}</em>" if description else ""
    content = (
        _h("Counter-offer received 🤝") +
        _p(f"<strong style='color:#fff;'>{influencer_name}</strong> made a counter-offer on your request.") +
        _box(f"💰 New price: <strong>${new_price:.2f}</strong>{desc_line}") +
        _p("Accept or reject the counter-offer in your requests page.", "#777") +
        _btn("View Counter-Offer →", f"{FRONTEND_URL}/fan/requests")
    )
    _send(fan_email, f"{influencer_name} made a counter-offer", _base(content))


def notify_fan_request_fulfilled(fan_email: str, influencer_name: str, proof_url: str | None) -> None:
    proof_line = f'<br><a href="{proof_url}" style="color:#F0A500;">View proof →</a>' if proof_url else ""
    content = (
        _h("Deal fulfilled — review now ⏱️") +
        _p(f"<strong style='color:#fff;'>{influencer_name}</strong> has fulfilled your request.{proof_line}") +
        _box("You have <strong>48 hours</strong> to review and release payment, or dispute if something's wrong. After 48h payment releases automatically.", "#F0A500") +
        _btn("Review & Release Payment →", f"{FRONTEND_URL}/fan/requests")
    )
    _send(fan_email, f"{influencer_name} fulfilled your request — action needed", _base(content))


def notify_influencer_payment_released(influencer_email: str, influencer_name: str, amount: float) -> None:
    content = (
        _h("Payment released 💸") +
        _p(f"Hey {influencer_name}, your earnings from a completed deal have been added to your balance.") +
        _box(f"💰 Added to balance: <strong>${amount:.2f}</strong>", "#00CDBE") +
        _p("Your payout will be processed in the next weekly batch (every Monday).", "#777") +
        _btn("View Earnings →", f"{FRONTEND_URL}/influencer/billing")
    )
    _send(influencer_email, f"${amount:.2f} added to your Leaky balance", _base(content))


def notify_influencer_approved(influencer_email: str, influencer_name: str) -> None:
    content = (
        _h("You're approved! 🎉") +
        _p(f"Hey {influencer_name}, your Leaky creator profile has been reviewed and approved.") +
        _p("You're now visible in the marketplace. Fans can start booking your services.", "#777") +
        _btn("Go to Dashboard →", f"{FRONTEND_URL}/dashboard")
    )
    _send(influencer_email, "Your Leaky profile is approved", _base(content))


def notify_admin_dispute(admin_email: str, request_id: int, fan_reason: str) -> None:
    content = (
        _h("New dispute filed 🚨") +
        _p(f"A fan has disputed request #{request_id}.") +
        _box(f"Reason: <em>{fan_reason}</em>", "#ef4444") +
        _btn("Review in Admin Panel →", f"{FRONTEND_URL}/admin")
    )
    _send(admin_email, f"Dispute on request #{request_id}", _base(content))


def notify_influencer_dispute(influencer_email: str, influencer_name: str, request_id: int) -> None:
    content = (
        _h("A fan disputed your fulfillment") +
        _p(f"Hey {influencer_name}, a fan has raised a dispute on request #{request_id}.") +
        _p("Our team will review the proof you submitted and make a decision within 48 hours.", "#777") +
        _btn("View Request →", f"{FRONTEND_URL}/dashboard")
    )
    _send(influencer_email, f"Dispute opened on request #{request_id}", _base(content))
