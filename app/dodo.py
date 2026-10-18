"""Dodo Payments: create checkout sessions on the server and verify webhooks."""
import httpx
from standardwebhooks.webhooks import Webhook, WebhookVerificationError

from . import settings


class PaymentError(Exception):
    pass


def create_checkout(*, order_id: str, product_name: str, amount_minor: int, currency: str,
                    name: str, email: str, phone: str, return_path: str) -> dict:
    """Returns {"session_id", "checkout_url"}. Amount is in paise or cents."""
    product_id = settings.DODO_PRODUCT_INR if currency == "inr" else settings.DODO_PRODUCT_USD
    body = {
        # A "pay what you want" product, so the server sets the exact price.
        "product_cart": [{"product_id": product_id, "quantity": 1, "amount": amount_minor}],
        "customer": {"name": name, "email": email, "phone_number": phone},
        "return_url": f"{settings.SITE_URL}{return_path}",
        "cancel_url": f"{settings.SITE_URL}/readings",
        "metadata": {"order_id": order_id, "reading": product_name},
    }
    try:
        r = httpx.post(f"{settings.DODO_BASE_URL}/checkouts", json=body, timeout=20,
                       headers={"Authorization": f"Bearer {settings.DODO_API_KEY}"})
    except httpx.HTTPError as e:
        raise PaymentError(f"Could not reach Dodo: {e}") from e
    if r.status_code >= 400:
        raise PaymentError(f"Dodo returned {r.status_code}: {r.text[:300]}")
    data = r.json()
    if not data.get("checkout_url"):
        raise PaymentError("Dodo did not return a checkout link")
    return data


def session_status(session_id: str) -> str | None:
    """Payment status for a checkout session, e.g. 'succeeded', or None if unknown."""
    try:
        r = httpx.get(f"{settings.DODO_BASE_URL}/checkouts/{session_id}", timeout=15,
                      headers={"Authorization": f"Bearer {settings.DODO_API_KEY}"})
        if r.status_code == 200:
            return r.json().get("payment_status")
    except httpx.HTTPError:
        pass
    return None


def verify_webhook(body: bytes, headers) -> dict:
    """Checks the signature Dodo sends (Standard Webhooks) and returns the event."""
    if not settings.DODO_WEBHOOK_SECRET:
        raise WebhookVerificationError("Webhook secret is not set")
    wh = Webhook(settings.DODO_WEBHOOK_SECRET)
    return wh.verify(body, {
        "webhook-id": headers.get("webhook-id", ""),
        "webhook-signature": headers.get("webhook-signature", ""),
        "webhook-timestamp": headers.get("webhook-timestamp", ""),
    })


__all__ = ["create_checkout", "session_status", "verify_webhook", "PaymentError", "WebhookVerificationError"]
