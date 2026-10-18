"""Dodo Payments: create checkout sessions on the server and verify webhooks."""
import httpx
from standardwebhooks.webhooks import Webhook, WebhookVerificationError

from . import settings


class PaymentError(Exception):
    pass


# The last checkout error, shown in the admin so problems can be seen without reading logs.
last_error = {"when": None, "message": None}


def _record(msg: str):
    import datetime
    last_error["when"] = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    last_error["message"] = msg[:400]


def check_setup() -> list[dict]:
    """Asks Dodo about each product with the current key. Returns one row per check for the admin."""
    rows = []
    for label, pid, cur in (("INR product", settings.DODO_PRODUCT_INR, "INR"), ("USD product", settings.DODO_PRODUCT_USD, "USD")):
        if not pid:
            rows.append({"name": label, "ok": False, "detail": "Not set in Render"})
            continue
        try:
            r = httpx.get(f"{settings.DODO_BASE_URL}/products/{pid}", timeout=15,
                          headers={"Authorization": f"Bearer {settings.DODO_API_KEY}"})
        except httpx.HTTPError as e:
            rows.append({"name": label, "ok": False, "detail": f"Could not reach Dodo: {e}"})
            continue
        if r.status_code == 401:
            rows.append({"name": label, "ok": False, "detail": "Dodo rejected the API key (401). Is it a key for the same mode as DODO_PAYMENTS_MODE?"})
        elif r.status_code == 404:
            rows.append({"name": label, "ok": False, "detail": f"Product not found (404) in {settings.DODO_MODE}. Was it created in the other mode?"})
        elif r.status_code >= 400:
            rows.append({"name": label, "ok": False, "detail": f"Dodo returned {r.status_code}: {r.text[:200]}"})
        else:
            price = (r.json() or {}).get("price") or {}
            pwyw = price.get("pay_what_you_want")
            pcur = (price.get("currency") or "").upper()
            problems = []
            if pwyw is False:
                problems.append("not set to Pay What You Want")
            if pcur and pcur != cur:
                problems.append(f"priced in {pcur}, should be {cur}")
            rows.append({"name": label, "ok": not problems,
                         "detail": "; ".join(problems) if problems else f"Found ({pcur or cur}, pay what you want)"})
    return rows


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
        _record(f"Could not reach Dodo: {e}")
        raise PaymentError(f"Could not reach Dodo: {e}") from e
    if r.status_code >= 400:
        _record(f"Dodo returned {r.status_code}: {r.text[:300]}")
        raise PaymentError(f"Dodo returned {r.status_code}: {r.text[:300]}")
    data = r.json()
    if not data.get("checkout_url"):
        _record("Dodo did not return a checkout link")
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
