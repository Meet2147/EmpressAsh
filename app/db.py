"""SQLite storage for members, orders and comments."""
import logging
import os
import re
import secrets
import sqlite3
from contextlib import contextmanager

from . import settings

SCHEMA = """
CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    phone TEXT NOT NULL,
    birthday TEXT NOT NULL,
    referral_code TEXT NOT NULL UNIQUE,
    referred_by TEXT,
    free_question TEXT,
    free_status TEXT NOT NULL DEFAULT 'requested',
    referral_credits INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    reading TEXT NOT NULL,
    format TEXT NOT NULL,
    currency TEXT NOT NULL,
    amount INTEGER NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    birthday TEXT,
    question TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    dodo_session TEXT,
    dodo_payment TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    paid_at TEXT
);
CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY,
    page TEXT NOT NULL,
    name TEXT NOT NULL,
    body TEXT NOT NULL,
    hidden INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    reading TEXT,
    body TEXT NOT NULL,
    approved INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY,
    order_id TEXT NOT NULL,
    sender TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
-- One Dodo product per reading, format and currency, created from the admin.
CREATE TABLE IF NOT EXISTS dodo_products (
    mode TEXT NOT NULL,
    reading TEXT NOT NULL,
    format TEXT NOT NULL,
    currency TEXT NOT NULL,
    price INTEGER NOT NULL,
    product_id TEXT NOT NULL,
    PRIMARY KEY (mode, reading, format, currency)
);
-- Problems clients report from their reading room (for example, behaviour on a call).
CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY,
    order_id TEXT NOT NULL,
    body TEXT NOT NULL,
    resolved INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
-- People Ash has blocked for breaking the conduct rules, matched by email and mobile.
CREATE TABLE IF NOT EXISTS blocked (
    id INTEGER PRIMARY KEY,
    email_key TEXT,
    phone_key TEXT,
    name TEXT,
    reason TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS messages_order ON messages(order_id, id);
CREATE INDEX IF NOT EXISTS comments_page ON comments(page, hidden);
"""


_fallback_warned = False


def path() -> str:
    """Database file. If the Render disk isn't mounted, fall back to a local
    folder so the site still starts (data there is lost on each deploy)."""
    global _fallback_warned
    d = settings.DATA_DIR
    try:
        os.makedirs(d, exist_ok=True)
        if not os.access(d, os.W_OK):
            raise PermissionError(d)
    except OSError:
        d = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
        os.makedirs(d, exist_ok=True)
        if not _fallback_warned:
            logging.getLogger("empressash").warning(
                "DATA_DIR %s is not writable; using %s. Add a Render disk at /var/data to keep data.", settings.DATA_DIR, d)
            _fallback_warned = True
    return os.path.join(d, "empressash.db")


@contextmanager
def conn():
    c = sqlite3.connect(path())
    c.row_factory = sqlite3.Row
    try:
        yield c
        c.commit()
    finally:
        c.close()


# Columns added after the first release; added on start if an older database lacks them.
ORDER_COLUMNS = {
    "token": "TEXT",            # secret part of the client's reading-room link
    "progress": "TEXT NOT NULL DEFAULT 'received'",  # received / reading / ready
    "reading_text": "TEXT",     # Ash's written reading (Markdown)
    "media_url": "TEXT",        # optional voice or video link
    "updated_at": "TEXT",
    "pay_note": "TEXT",         # why a payment is held for Ash to check
}

MESSAGE_COLUMNS = {
    "flagged": "INTEGER NOT NULL DEFAULT 0",  # contains words from the abuse list
}


MEMBER_COLUMNS = {
    "email_key": "TEXT",   # email in a standard form, so tricks like dots or +tags count as the same address
    "phone_key": "TEXT",   # last 10 digits of the mobile number
}


def email_key(email: str) -> str:
    """john.smith+tarot@gmail.com and johnsmith@gmail.com are the same inbox, so they get the same key."""
    local, _, domain = email.strip().lower().partition("@")
    local = local.split("+", 1)[0]
    if domain in ("gmail.com", "googlemail.com"):
        local, domain = local.replace(".", ""), "gmail.com"
    return f"{local}@{domain}"


def phone_key(phone: str) -> str:
    return re.sub(r"\D", "", phone)[-10:]


def init():
    with conn() as c:
        c.executescript(SCHEMA)
        have = {r["name"] for r in c.execute("PRAGMA table_info(orders)")}
        for col, kind in ORDER_COLUMNS.items():
            if col not in have:
                c.execute(f"ALTER TABLE orders ADD COLUMN {col} {kind}")
        for row in c.execute("SELECT id FROM orders WHERE token IS NULL").fetchall():
            c.execute("UPDATE orders SET token=? WHERE id=?", (new_token(), row["id"]))
        c.execute("CREATE UNIQUE INDEX IF NOT EXISTS orders_token ON orders(token)")
        have = {r["name"] for r in c.execute("PRAGMA table_info(members)")}
        for col, kind in MEMBER_COLUMNS.items():
            if col not in have:
                c.execute(f"ALTER TABLE members ADD COLUMN {col} {kind}")
        for row in c.execute("SELECT id, email, phone FROM members WHERE email_key IS NULL OR phone_key IS NULL").fetchall():
            c.execute("UPDATE members SET email_key=?, phone_key=? WHERE id=?",
                      (email_key(row["email"]), phone_key(row["phone"]), row["id"]))
        have = {r["name"] for r in c.execute("PRAGMA table_info(messages)")}
        for col, kind in MESSAGE_COLUMNS.items():
            if col not in have:
                c.execute(f"ALTER TABLE messages ADD COLUMN {col} {kind}")
        c.execute("CREATE INDEX IF NOT EXISTS members_email_key ON members(email_key)")
        c.execute("CREATE INDEX IF NOT EXISTS members_phone_key ON members(phone_key)")


def is_blocked(c, email: str, phone: str) -> bool:
    return bool(c.execute("SELECT 1 FROM blocked WHERE email_key=? OR phone_key=?",
                          (email_key(email), phone_key(phone))).fetchone())


def new_code(c) -> str:
    alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
    while True:
        code = "ASH-" + "".join(secrets.choice(alphabet) for _ in range(5))
        if not c.execute("SELECT 1 FROM members WHERE referral_code=?", (code,)).fetchone():
            return code


def new_token() -> str:
    return secrets.token_urlsafe(18)


def new_order_id() -> str:
    return "EA" + secrets.token_hex(5).upper()
