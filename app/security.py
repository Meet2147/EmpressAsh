"""Security helpers: response headers, request size limit, safe Markdown and a simple abuse-word check."""
import re
import secrets
from urllib.parse import urlparse

import markdown as md
from markdown.treeprocessors import Treeprocessor
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import PlainTextResponse

from . import settings

# Biggest request the site accepts. Forms are tiny; this stops someone filling memory with a huge upload.
MAX_BODY = 256 * 1024

# Where the browser may load things from. Anything else (an injected script, a hidden frame, a form
# that posts to another site) is blocked by the browser.
CSP = "; ".join([
    "default-src 'self'",
    "script-src 'self' 'nonce-{nonce}' https://app.cal.com https://cal.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "media-src 'self' https:",
    "frame-src https://cal.com https://app.cal.com https://*.cal.com",
    "connect-src 'self' https://app.cal.com https://cal.com https://*.cal.com",
    "form-action 'self' https://*.dodopayments.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
])


class SecurityHeaders(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        length = request.headers.get("content-length")
        if length and (not length.isdigit() or int(length) > MAX_BODY):
            return PlainTextResponse("Request too large", status_code=413)
        request.state.nonce = secrets.token_urlsafe(16)
        resp = await call_next(request)
        h = resp.headers
        h.setdefault("Content-Security-Policy", CSP.format(nonce=request.state.nonce))
        h.setdefault("X-Content-Type-Options", "nosniff")
        h.setdefault("X-Frame-Options", "DENY")
        h.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        h.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()")
        h.setdefault("Cross-Origin-Opener-Policy", "same-origin")
        if settings.SITE_URL.startswith("https://"):
            h.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        path = request.url.path
        if path.startswith(("/admin", "/room/", "/checkout")):
            # Private pages: never kept by shared computers or proxies.
            h["Cache-Control"] = "no-store"
        return resp


# ---------- Markdown without raw HTML or script links ----------

SAFE_SCHEMES = {"http", "https", "mailto", ""}


class _SafeLinks(Treeprocessor):
    def run(self, root):
        for el in root.iter():
            for attr in ("href", "src"):
                v = el.get(attr)
                if v is not None and urlparse(v.strip()).scheme.lower() not in SAFE_SCHEMES:
                    el.set(attr, "#")


def safe_markdown(text: str, extensions=("extra",)) -> str:
    """Markdown to HTML with any raw HTML shown as text and javascript: links removed."""
    m = md.Markdown(extensions=list(extensions))
    m.preprocessors.deregister("html_block")
    m.inlinePatterns.deregister("html")
    m.treeprocessors.register(_SafeLinks(m), "safe_links", 0)
    return m.convert(text or "")


# ---------- trusted Dodo addresses ----------

def is_dodo_url(url: str) -> bool:
    """True only for https links on dodopayments.com, so a payment can never be sent anywhere else."""
    try:
        u = urlparse(url)
    except ValueError:
        return False
    host = (u.hostname or "").lower()
    return u.scheme == "https" and (host == "dodopayments.com" or host.endswith(".dodopayments.com"))


# ---------- abuse words ----------
# A short list for holding public comments back until Ash looks at them. It isn't meant to catch
# everything; Ash can still hide anything from the admin, and block a person.
_ABUSE = [
    # sexual
    r"nudes?", r"naked", r"boobs?", r"tits", r"pussy", r"dick ?pics?", r"cock", r"porn\w*", r"horny", r"blow ?job",
    r"send (?:me )?pics", r"sexy pics", r"onlyfans", r"cum", r"slut", r"whore",
    # hate and abuse
    r"n[i1]gg(?:er|a)s?", r"fag(?:got)?s?", r"retards?", r"kikes?", r"chinks?", r"pakis?", r"trann(?:y|ies)",
    r"kill yourself", r"kys", r"rape\w*", r"fuck\w*", r"motherfucker", r"bitch\w*", r"cunt\w*",
    # common Hindi abuse
    r"chutiy\w*", r"madar ?chod\w*", r"behen ?chod\w*", r"bhen ?chod\w*", r"randi\w*", r"gaand\w*", r"lund\w*",
    r"bhosd\w*", r"harami\w*",
]
_ABUSE_RE = re.compile(r"(?<![a-z0-9])(?:" + "|".join(_ABUSE) + r")(?![a-z0-9])", re.IGNORECASE)


def looks_abusive(*texts: str) -> bool:
    return any(_ABUSE_RE.search(t or "") for t in texts)
