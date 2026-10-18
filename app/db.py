"""SQLite storage for members, orders and comments."""
import logging
import os
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


def init():
    with conn() as c:
        c.executescript(SCHEMA)


def new_code(c) -> str:
    alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
    while True:
        code = "ASH-" + "".join(secrets.choice(alphabet) for _ in range(5))
        if not c.execute("SELECT 1 FROM members WHERE referral_code=?", (code,)).fetchone():
            return code


def new_order_id() -> str:
    return "EA" + secrets.token_hex(5).upper()
