"""Site settings. Secrets come from environment variables set in Render, never from code."""
import os
import secrets


def env(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


def env_bool(name: str, default: bool = False) -> bool:
    v = env(name)
    return default if not v else v.lower() in {"1", "true", "yes", "on"}


# Public URL of the site, used for Dodo return links and share links.
SITE_URL = env("SITE_URL", "http://localhost:8000").rstrip("/")

# Where the SQLite database lives. On Render, point this at the persistent disk.
DATA_DIR = env("DATA_DIR", os.path.join(os.path.dirname(os.path.dirname(__file__)), "data"))

# Signs the admin login cookie. Set a long random value in Render.
SECRET_KEY = env("SECRET_KEY") or secrets.token_hex(32)
ADMIN_PASSWORD = env("ADMIN_PASSWORD")

# Dodo Payments
DODO_API_KEY = env("DODO_PAYMENTS_API_KEY")
DODO_WEBHOOK_SECRET = env("DODO_PAYMENTS_WEBHOOK_KEY")
DODO_MODE = env("DODO_PAYMENTS_MODE", "test_mode")  # test_mode or live_mode
DODO_BASE_URL = env(
    "DODO_PAYMENTS_BASE_URL",
    "https://live.dodopayments.com" if DODO_MODE == "live_mode" else "https://test.dodopayments.com",
)
# One "pay what you want" product per currency. The server sets the exact price
# for each reading, so Ash never has to create 90 products.
DODO_PRODUCT_INR = env("DODO_PRODUCT_INR")
DODO_PRODUCT_USD = env("DODO_PRODUCT_USD")

# Live one-on-one calls launch later (decided on the call); written readings sell now.
LIVE_READINGS_OPEN = env_bool("LIVE_READINGS_OPEN", False)
# Cal.com link clients use to pick a time after paying for a live reading.
CAL_LINK = env("CAL_LINK")

# Public contact details shown on the site.
CONTACT = {
    "email": env("CONTACT_EMAIL"),
    "phone": env("CONTACT_PHONE"),
    "whatsapp": env("CONTACT_WHATSAPP"),  # digits only, e.g. 919876543210
}
SOCIAL = {
    "instagram": env("INSTAGRAM_URL"),
    "youtube": env("YOUTUBE_URL"),
    "telegram": env("TELEGRAM_URL"),
}


def payments_ready() -> bool:
    return bool(DODO_API_KEY and DODO_PRODUCT_INR and DODO_PRODUCT_USD)
