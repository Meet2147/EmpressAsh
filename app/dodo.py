"""Dodo Payments: create checkout sessions on the server and verify webhooks."""
import httpx
from standardwebhooks.webhooks import Webhook, WebhookVerificationError

from . import settings
from .security import is_dodo_url


class PaymentError(Exception):
    pass


# The last checkout error, shown in the admin so problems can be seen without reading logs.
last_error = {"when": None, "message": None}


def _record(msg: str):
    import datetime
    last_error["when"] = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    last_error["message"] = msg[:400]


def _headers():
    return {"Authorization": f"Bearer {settings.DODO_API_KEY}"}


def wanted_products():
    """Every product the site sells: (reading, format, currency, price in whole units)."""
    from .catalog import READINGS, FORMAT_IDS
    for r in READINGS:
        for i, fmt in enumerate(FORMAT_IDS):
            for cur in ("inr", "usd"):
                price = r[cur][i]
                if price is not None:
                    yield r, fmt, cur, price
    from .catalog import BUNDLES
    for b in BUNDLES:
        for cur in ("inr", "usd"):
            yield b, "credits", cur, b[cur]


def stored_product(reading: str, fmt: str, currency: str, price: int) -> str | None:
    """The Dodo product made for this exact reading and price in the current mode."""
    from . import db
    with db.conn() as c:
        row = c.execute("SELECT product_id, price FROM dodo_products WHERE mode=? AND reading=? AND format=? AND currency=?",
                        (settings.DODO_MODE, reading, fmt, currency)).fetchone()
    return row["product_id"] if row and row["price"] == price else None


def products_status() -> tuple[int, int]:
    """(created, needed) for the current mode and prices."""
    wanted = list(wanted_products())
    done = sum(1 for r, fmt, cur, price in wanted if stored_product(r["id"], fmt, cur, price))
    return done, len(wanted)


def create_products() -> dict:
    """Creates any missing products in Dodo and remembers their IDs. Safe to run again."""
    from . import db
    from .catalog import format_by_id
    made, errors = 0, []
    with httpx.Client(timeout=20, headers=_headers()) as client:
        for r, fmt, cur, price in wanted_products():
            if stored_product(r["id"], fmt, cur, price):
                continue
            body = {
                "name": f"{r['name']} · {(format_by_id(fmt) or {'label': 'Reading credits'})['label']}",
                "description": r["desc"],
                "tax_category": "digital_products",
                "price": {"type": "one_time_price", "currency": cur.upper(), "price": price * 100,
                          "discount": 0, "purchasing_power_parity": False},
                "metadata": {"reading": r["id"], "format": fmt},
            }
            try:
                resp = client.post(f"{settings.DODO_BASE_URL}/products", json=body)
            except httpx.HTTPError as e:
                errors.append(f"Could not reach Dodo: {e}")
                break
            if resp.status_code == 401:
                errors.append("Dodo rejected the API key (401). Is it a key for the same mode as DODO_PAYMENTS_MODE?")
                break
            if resp.status_code >= 400 or not (resp.json() or {}).get("product_id"):
                errors.append(f"{body['name']} ({cur.upper()}): Dodo returned {resp.status_code}: {resp.text[:200]}")
                if len(errors) >= 3:
                    break
                continue
            with db.conn() as c:
                c.execute("""INSERT INTO dodo_products(mode, reading, format, currency, price, product_id) VALUES (?,?,?,?,?,?)
                             ON CONFLICT(mode, reading, format, currency) DO UPDATE SET price=excluded.price,
                             product_id=excluded.product_id""",
                          (settings.DODO_MODE, r["id"], fmt, cur, price, resp.json()["product_id"]))
            made += 1
    done, needed = products_status()
    return {"made": made, "done": done, "needed": needed, "errors": errors}


def check_setup() -> list[dict]:
    """Asks Dodo about each product with the current key. Returns one row per check for the admin."""
    rows = []
    done, needed = products_status()
    if done:
        rows.append({"name": "Reading products", "ok": done == needed,
                     "detail": f"{done} of {needed} created in Dodo" + ("" if done == needed else ". Press Create products in Dodo to finish.")})
        return rows
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


def can_sell(reading: str, fmt: str, currency: str, price: int) -> bool:
    if not settings.DODO_API_KEY:
        return False
    if stored_product(reading, fmt, currency, price):
        return True
    return bool(settings.DODO_PRODUCT_INR if currency == "inr" else settings.DODO_PRODUCT_USD)


def create_checkout(*, order_id: str, reading: str, fmt: str, product_name: str, amount_minor: int, currency: str,
                    name: str, email: str, phone: str, return_path: str) -> dict:
    """Returns {"session_id", "checkout_url"}. Amount is in paise or cents."""
    product_id = stored_product(reading, fmt, currency, amount_minor // 100)
    if product_id:
        # This reading's own product, already priced in Dodo.
        item = {"product_id": product_id, "quantity": 1}
    else:
        # Fallback: a "pay what you want" product from Render, so the server sets the price.
        product_id = settings.DODO_PRODUCT_INR if currency == "inr" else settings.DODO_PRODUCT_USD
        item = {"product_id": product_id, "quantity": 1, "amount": amount_minor}
    body = {
        "product_cart": [item],
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
    if not is_dodo_url(data["checkout_url"]):
        # Never send a client to pay anywhere except Dodo's own secure page.
        _record("Dodo returned a payment link outside dodopayments.com; refused it")
        raise PaymentError(f"Unexpected checkout link host: {data['checkout_url'][:80]}")
    return data


def session_status(session_id: str) -> str | None:
    """Payment status for a checkout session, e.g. 'succeeded', or None if unknown."""
    if not session_id or not all(ch.isalnum() or ch in "_-" for ch in session_id):
        return None
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


def paid_enough(data: dict, order) -> tuple[bool, str]:
    """Checks a payment against the order it claims to pay for.

    The order ID travels in the payment's metadata. Someone could try paying for a cheap reading
    through a Dodo payment link while putting an expensive order's ID in that metadata, so the
    amount and currency Dodo actually took must cover the order. Paying more (tax added) is fine.
    """
    session = data.get("checkout_session_id")
    if session and order["dodo_session"]:
        # Paid through the checkout this site created for this order, at the price the server set.
        if session == order["dodo_session"]:
            return True, ""
        return False, "paid through a different checkout than this order's"
    cur = (data.get("currency") or "").lower()
    total = data.get("total_amount")
    if cur and cur != order["currency"]:
        return False, f"paid in {cur.upper()}, order is in {order['currency'].upper()}"
    if isinstance(total, int) and total < order["amount"] * 100:
        return False, f"paid {total / 100:.2f}, order costs {order['amount']}"
    if not cur or not isinstance(total, int):
        return False, "payment had no amount or currency"
    return True, ""


__all__ = ["create_checkout", "session_status", "verify_webhook", "PaymentError", "WebhookVerificationError"]
