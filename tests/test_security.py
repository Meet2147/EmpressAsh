"""Security checks. Run with:  pip install pytest && python -m pytest tests"""
import base64
import json
import os
import tempfile
import time

os.environ.update(
    DATA_DIR=tempfile.mkdtemp(),
    ADMIN_PASSWORD="a-long-test-password",
    SITE_URL="https://example.test",
    DODO_PAYMENTS_API_KEY="test-key",
    DODO_PRODUCT_INR="pdt_inr",
    DODO_PRODUCT_USD="pdt_usd",
    DODO_PAYMENTS_WEBHOOK_KEY="whsec_" + base64.b64encode(b"0123456789abcdef0123456789abcdef").decode(),
    DODO_PAYMENTS_BASE_URL="https://evil.example.com",
    LIVE_READINGS_OPEN="true",
)

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from standardwebhooks.webhooks import Webhook  # noqa: E402

from app import db, dodo, main, settings  # noqa: E402
from app.security import is_dodo_url, looks_abusive, safe_markdown  # noqa: E402


@pytest.fixture(scope="module")
def client():
    with TestClient(main.app, base_url="https://example.test") as c:
        yield c


def make_order(oid="EATEST00001", amount=2499, currency="inr", session="cks_good", status="pending"):
    with db.conn() as c:
        c.execute("DELETE FROM orders WHERE id=?", (oid,))
        c.execute("""INSERT INTO orders(id, token, reading, format, currency, amount, name, email, phone, birthday, question,
                     status, dodo_session) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                  (oid, db.new_token(), "year", "written", currency, amount, "Test Person", "t@example.com",
                   "+91 98765 43210", "1990-01-01", "q", status, session))
    return oid


def order(oid):
    with db.conn() as c:
        return c.execute("SELECT * FROM orders WHERE id=?", (oid,)).fetchone()


def send_webhook(client, event):
    body = json.dumps(event)
    wh = Webhook(settings.DODO_WEBHOOK_SECRET)
    msg_id, now = "msg_" + str(time.time_ns()), int(time.time())
    from datetime import datetime, timezone
    sig = wh.sign(msg_id, datetime.fromtimestamp(now, tz=timezone.utc), body)
    return client.post("/webhooks/dodo", content=body, headers={
        "webhook-id": msg_id, "webhook-timestamp": str(now), "webhook-signature": sig})


def test_api_key_only_goes_to_dodo():
    assert settings.DODO_BASE_URL == "https://test.dodopayments.com"


def test_checkout_link_must_be_dodo():
    assert is_dodo_url("https://test.checkout.dodopayments.com/session/abc")
    assert not is_dodo_url("https://dodopayments.com.evil.com/x")
    assert not is_dodo_url("http://checkout.dodopayments.com/x")
    assert not is_dodo_url("https://evil.com/?dodopayments.com")


def test_unsigned_webhook_rejected(client):
    oid = make_order()
    r = client.post("/webhooks/dodo", json={"type": "payment.succeeded", "data": {"metadata": {"order_id": oid}}})
    assert r.status_code == 401
    assert order(oid)["status"] == "pending"


def test_webhook_through_own_checkout_marks_paid(client):
    oid = make_order()
    send_webhook(client, {"type": "payment.succeeded", "data": {
        "payment_id": "pay_1", "checkout_session_id": "cks_good", "total_amount": 249900, "currency": "INR",
        "metadata": {"order_id": oid}}})
    assert order(oid)["status"] == "paid"


def test_cheap_payment_cannot_unlock_expensive_order(client):
    # Someone pays ₹299 through a payment link but puts the ₹2499 order's ID in the metadata.
    oid = make_order()
    send_webhook(client, {"type": "payment.succeeded", "data": {
        "payment_id": "pay_2", "total_amount": 29900, "currency": "INR", "metadata": {"order_id": oid}}})
    assert order(oid)["status"] == "review"
    oid = make_order()
    send_webhook(client, {"type": "payment.succeeded", "data": {
        "payment_id": "pay_3", "checkout_session_id": "cks_other", "total_amount": 249900, "currency": "INR",
        "metadata": {"order_id": oid}}})
    assert order(oid)["status"] == "review"
    oid = make_order()
    send_webhook(client, {"type": "payment.succeeded", "data": {
        "payment_id": "pay_4", "total_amount": 2499, "currency": "USD", "metadata": {"order_id": oid}}})
    assert order(oid)["status"] == "review"


def test_repeated_webhook_keeps_delivered(client):
    oid = make_order(status="delivered")
    send_webhook(client, {"type": "payment.succeeded", "data": {
        "payment_id": "pay_5", "checkout_session_id": "cks_good", "metadata": {"order_id": oid}}})
    assert order(oid)["status"] == "delivered"


def test_refund_marks_order(client):
    oid = make_order()
    send_webhook(client, {"type": "payment.succeeded", "data": {
        "payment_id": "pay_6", "checkout_session_id": "cks_good", "metadata": {"order_id": oid}}})
    send_webhook(client, {"type": "refund.succeeded", "data": {"payment_id": "pay_6", "refund_id": "r1"}})
    assert order(oid)["status"] == "refunded"


def test_order_ref_does_not_open_room(client):
    oid = make_order()
    r = client.get(f"/thank-you?order={oid}", follow_redirects=False)
    assert order(oid)["token"] not in r.headers["location"]


def test_markdown_strips_scripts():
    out = safe_markdown('<script>alert(1)</script>\n\n[x](javascript:alert(1)) <img src=x onerror=alert(1)>')
    assert "<script" not in out and "<img" not in out and "javascript:" not in out


def test_security_headers(client):
    r = client.get("/")
    csp = r.headers["content-security-policy"]
    assert "frame-ancestors 'none'" in csp and "'nonce-" in csp
    nonce = csp.split("'nonce-")[1].split("'")[0]
    assert f'nonce="{nonce}"' in r.text
    assert r.headers["x-frame-options"] == "DENY"
    assert "max-age" in r.headers["strict-transport-security"]


def test_big_request_refused(client):
    r = client.post("/join", content=b"x" * (300 * 1024), headers={"content-type": "application/x-www-form-urlencoded"})
    assert r.status_code == 413


def test_admin_cookie_tied_to_password(client):
    r = client.post("/admin/login", data={"password": "a-long-test-password"}, follow_redirects=False)
    assert r.status_code == 303
    cookie = r.cookies.get("ea_admin")
    client.cookies.set("ea_admin", cookie)
    assert "Ash's dashboard" in client.get("/admin").text
    old = settings.ADMIN_PASSWORD
    settings.ADMIN_PASSWORD = "a-new-long-password"
    try:
        assert "Ash's dashboard" not in client.get("/admin").text
    finally:
        settings.ADMIN_PASSWORD = old
        client.cookies.clear()
    # An old-style cookie signed as plain "admin" no longer works.
    client.cookies.set("ea_admin", main.signer.dumps("admin"))
    assert "Ash's dashboard" not in client.get("/admin").text
    client.cookies.clear()


def test_abusive_comment_held(client):
    client.post("/practice", data={"name": "x", "body": "send nudes"})
    client.post("/practice", data={"name": "y", "body": "Lovely cards, thank you"})
    with db.conn() as c:
        rows = {r["body"]: r["hidden"] for r in c.execute("SELECT body, hidden FROM comments")}
    assert rows["send nudes"] == 1 and rows["Lovely cards, thank you"] == 0
    assert not looks_abusive("grapes and a cockatoo")


def test_blocked_person_cannot_book_or_join(client):
    with db.conn() as c:
        c.execute("INSERT INTO blocked(email_key, phone_key, name) VALUES (?,?,?)",
                  (db.email_key("bad.guy@gmail.com"), db.phone_key("+91 99999 00000"), "Bad"))
    r = client.post("/join", data={"name": "B", "email": "badguy+x@gmail.com", "phone": "9999900000",
                                   "birthday": "1990-01-01", "agree": "yes"})
    assert "register these details" in r.text
    r = client.post("/checkout/yes-no", data={"format": "written", "name": "B", "email": "bad.guy@gmail.com",
                                              "phone": "+1 555 999 9900 000", "birthday": "1990-01-01",
                                              "question": "q", "agree": "yes"})
    assert "take a booking for these details" in r.text


def test_live_booking_needs_conduct_agreement(client):
    r = client.post("/checkout/yes-no", data={"format": "video", "name": "A", "email": "a@example.com",
                                              "phone": "+91 98765 11111", "birthday": "1990-01-01",
                                              "question": "q", "agree": "yes"})
    assert "conduct rules" in r.text


def test_room_report(client):
    oid = make_order(status="paid")
    tok = order(oid)["token"]
    r = client.post(f"/room/{tok}/report", data={"body": "Rude remarks on the call"}, follow_redirects=False)
    assert r.status_code == 303
    with db.conn() as c:
        assert c.execute("SELECT 1 FROM reports WHERE order_id=?", (oid,)).fetchone()
