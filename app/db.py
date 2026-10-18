"""SQLite storage for members, orders and comments."""
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


def path() -> str:
    os.makedirs(settings.DATA_DIR, exist_ok=True)
    return os.path.join(settings.DATA_DIR, "empressash.db")


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
