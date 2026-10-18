"""EmpressAsh web app."""
import csv
import datetime
import hashlib
import hmac
import io
import logging
import os
import re
import time
from collections import defaultdict, deque
from urllib.parse import quote

import markdown as md
from fastapi import FastAPI, Form, Request
from fastapi.responses import HTMLResponse, PlainTextResponse, RedirectResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from itsdangerous import BadSignature, URLSafeTimedSerializer

from . import catalog, db, dodo, geo, settings, tarot
from .security import SecurityHeaders, looks_abusive, safe_markdown

log = logging.getLogger("empressash")
logging.basicConfig(level=logging.INFO)

HERE = os.path.dirname(__file__)
STORIES_DIR = os.path.join(os.path.dirname(HERE), "content", "stories")

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
app.add_middleware(SecurityHeaders)
app.mount("/static", StaticFiles(directory=os.path.join(HERE, "static")), name="static")
templates = Jinja2Templates(directory=os.path.join(HERE, "templates"))
signer = URLSafeTimedSerializer(settings.SECRET_KEY, salt="admin")

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
PHONE_RE = re.compile(r"^\+?[0-9 ()-]{7,20}$")


@app.on_event("startup")
def startup():
    db.init()


# ---------- helpers ----------

def render(request: Request, template: str, status: int = 200, **ctx):
    ctx.update(
        request=request,
        s=settings,
        catalog=catalog,
        geo_currency=geo.currency(request),
        nav_page=ctx.get("nav_page", ""),
        nonce=getattr(request.state, "nonce", ""),
        year=datetime.date.today().year,
    )
    return templates.TemplateResponse(request, template, ctx, status_code=status)


_hits: dict = defaultdict(deque)
_last_sweep = [0.0]


def _hit(key, limit: int, per_seconds: int) -> bool:
    q = _hits[key]
    now = time.time()
    while q and q[0] < now - per_seconds:
        q.popleft()
    if len(q) >= limit:
        return True
    q.append(now)
    return False


def too_many(request: Request, bucket: str, limit: int, per_seconds: int, site_limit: int = 0) -> bool:
    """Small in-memory rate limit per visitor IP, plus an optional limit for the whole site.

    The IP comes from the proxy's forwarding header, which a visitor can fake to look like many
    people. The site-wide limit can't be dodged that way, so sensitive forms use both.
    """
    now = time.time()
    if now - _last_sweep[0] > 600 or len(_hits) > 20000:
        # Forget visitors with no recent hits so the table can't grow without end.
        for k in [k for k, q in _hits.items() if not q or q[-1] < now - 3600]:
            del _hits[k]
        _last_sweep[0] = now
    ip = request.client.host if request.client else "?"
    if site_limit and _hit((bucket, "*site*"), site_limit, per_seconds):
        return True
    return _hit((bucket, ip), limit, per_seconds)


def clean(v: str, n: int) -> str:
    return (v or "").strip()[:n]


def valid_birthday(v: str) -> bool:
    try:
        d = datetime.date.fromisoformat(v)
    except ValueError:
        return False
    age = (datetime.date.today() - d).days / 365.25
    return 18 <= age <= 120


def comments_for(page: str):
    with db.conn() as c:
        return c.execute("SELECT name, body, created_at FROM comments WHERE page=? AND hidden=0 ORDER BY id DESC LIMIT 100",
                         (page,)).fetchall()


def add_comment(request: Request, page: str, name: str, body: str, website: str) -> str | None:
    if website:  # honeypot field that people never see
        return None
    name, body = clean(name, 60), clean(body, 1000)
    if not name or not body:
        return "Please add your name and a comment."
    if too_many(request, "comment", 5, 600, site_limit=120):
        return "You've commented a lot just now. Please try again in a few minutes."
    # Comments with hateful or sexual words wait, hidden, until Ash looks at them in the admin.
    held = 1 if looks_abusive(name, body) else 0
    with db.conn() as c:
        c.execute("INSERT INTO comments(page, name, body, hidden) VALUES (?,?,?,?)", (page, name, body, held))
    return None


def load_stories():
    stories = []
    if not os.path.isdir(STORIES_DIR):
        return stories
    for fn in sorted(os.listdir(STORIES_DIR)):
        if not fn.endswith(".md") or fn == "README.md":
            continue
        raw = open(os.path.join(STORIES_DIR, fn), encoding="utf-8").read()
        meta, body = {}, raw
        if raw.startswith("---"):
            _, head, body = raw.split("---", 2)
            for line in head.strip().splitlines():
                k, _, v = line.partition(":")
                meta[k.strip()] = v.strip()
        stories.append({
            "slug": fn[:-3],
            "title": meta.get("title", fn[:-3].replace("-", " ").title()),
            "date": meta.get("date", ""),
            "summary": meta.get("summary", ""),
            "draft": meta.get("draft", "").lower() == "true",
            "html": safe_markdown(body.strip()),
        })
    return sorted([s for s in stories if not s["draft"]], key=lambda s: s["date"], reverse=True)


# ---------- pages ----------

@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    return render(request, "index.html", nav_page="home", featured=catalog.READINGS[:8],
                  card=tarot.card_of_the_day(), stories=load_stories()[:3], reviews=approved_reviews(3))


@app.get("/about", response_class=HTMLResponse)
def about(request: Request):
    return render(request, "about.html", nav_page="about")


@app.get("/contact", response_class=HTMLResponse)
def contact(request: Request):
    return render(request, "contact.html", nav_page="contact")


@app.get("/policies", response_class=HTMLResponse)
def policies(request: Request):
    return render(request, "policies.html")


@app.get("/readings", response_class=HTMLResponse)
def readings(request: Request):
    return render(request, "readings.html", nav_page="readings")


@app.get("/readings/{slug}", response_class=HTMLResponse)
def reading_page(request: Request, slug: str):
    r = catalog.BY_ID.get(slug)
    if not r:
        return render(request, "404.html", status=404)
    others = [x for x in catalog.READINGS if x["id"] != slug][:4]
    return render(request, "reading.html", nav_page="readings", r=r, others=others)


@app.get("/checkout/{slug}", response_class=HTMLResponse)
def checkout_form(request: Request, slug: str, format: str = "written", currency: str = "", question: str = ""):
    r = catalog.BY_ID.get(slug)
    f = catalog.format_by_id(format)
    if not r or not f:
        return render(request, "404.html", status=404)
    # "Have Ash read it for you" on Ask the cards passes the question and the cards drawn.
    return render(request, "checkout.html", nav_page="readings", r=r, f=f, error=None,
                  form={"question": clean(question, 1500)})


@app.post("/checkout/{slug}", response_class=HTMLResponse)
def checkout_submit(request: Request, slug: str, format: str = Form(...), currency: str = Form("usd"),
                    name: str = Form(""), email: str = Form(""), phone: str = Form(""),
                    birthday: str = Form(""), question: str = Form(""), agree: str = Form(""),
                    conduct: str = Form("")):
    r = catalog.BY_ID.get(slug)
    f = catalog.format_by_id(format)
    if not r or not f:
        return render(request, "404.html", status=404)
    # Location decides the currency; the browser's time zone guess is only used when it can't be told.
    currency = geo.currency(request) or ("inr" if currency == "inr" else "usd")
    form = dict(name=clean(name, 80), email=clean(email, 120), phone=clean(phone, 25),
                birthday=clean(birthday, 10), question=clean(question, 1500), currency=currency)

    def fail(msg):
        return render(request, "checkout.html", nav_page="readings", r=r, f=f, error=msg, form=form, status=400)

    amount = catalog.price(r, f["id"], currency)
    if f["live"] and not settings.LIVE_READINGS_OPEN:
        return fail("Live one-on-one readings open soon. Written readings are available now.")
    if amount is None:
        return fail("This reading is priced on request. Please message Ash.")
    if not form["name"] or not EMAIL_RE.match(form["email"]) or not PHONE_RE.match(form["phone"]):
        return fail("Please enter your full name, a valid email and a mobile number.")
    if not valid_birthday(form["birthday"]):
        return fail("Please enter your date of birth. Readings are for adults 18 and over.")
    if not form["question"]:
        return fail("Please write the question you'd like Ash to read on.")
    if agree != "yes":
        return fail("Please confirm you've read the policies.")
    if f["live"] and conduct != "yes":
        return fail("Please agree to the conduct rules for live sessions.")
    with db.conn() as c:
        if db.is_blocked(c, form["email"], form["phone"]):
            return fail("We can't take a booking for these details. Please contact Ash if you think this is a mistake.")
    if not dodo.can_sell(r["id"], f["id"], currency, amount):
        return fail("Online booking opens very soon. Please check back shortly.")
    if too_many(request, "checkout", 10, 600, site_limit=200):
        return fail("Too many attempts. Please wait a few minutes and try again.")

    order_id, token = db.new_order_id(), db.new_token()
    with db.conn() as c:
        c.execute("""INSERT INTO orders(id, token, reading, format, currency, amount, name, email, phone, birthday, question)
                     VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
                  (order_id, token, r["id"], f["id"], currency, amount, form["name"], form["email"], form["phone"],
                   form["birthday"], form["question"]))
    try:
        session = dodo.create_checkout(order_id=order_id, reading=r["id"], fmt=f["id"], product_name=f"{r['name']} · {f['label']}",
                                       amount_minor=amount * 100, currency=currency,
                                       name=form["name"], email=form["email"], phone=form["phone"],
                                       return_path=f"/room/{token}")
    except dodo.PaymentError as e:
        log.error("Checkout failed for %s: %s", order_id, e)
        with db.conn() as c:
            c.execute("UPDATE orders SET status='failed' WHERE id=?", (order_id,))
        return fail("We couldn't start the payment just now. Please try again, or message Ash.")
    with db.conn() as c:
        c.execute("UPDATE orders SET dodo_session=? WHERE id=?", (session.get("session_id"), order_id))
    return RedirectResponse(session["checkout_url"], status_code=303)


def refresh_payment(o):
    """The webhook usually marks orders paid first; this is a fallback check with Dodo."""
    if o["status"] == "pending" and o["dodo_session"]:
        if dodo.session_status(o["dodo_session"]) == "succeeded":
            with db.conn() as c:
                c.execute("UPDATE orders SET status='paid', paid_at=datetime('now') WHERE id=? AND status='pending'", (o["id"],))
                o = c.execute("SELECT * FROM orders WHERE id=?", (o["id"],)).fetchone()
    return o


def cal_path() -> str:
    """'ash/reading' from a Cal.com link like https://cal.com/ash/reading, for the embedded calendar."""
    link = settings.CAL_LINK.strip()
    m = re.match(r"^https?://(?:app\.)?cal\.com/(.+?)/?$", link)
    return m.group(1) if m else ""


@app.get("/thank-you")
def thank_you():
    # Older payment links pointed here. The order reference is shown to clients and sent to Dodo,
    # so it must not open anyone's reading room; rooms are reached only by their private link.
    return RedirectResponse("/my-readings", status_code=303)


# ---------- the client's private reading room ----------

def order_by_token(token: str):
    if not token or len(token) > 64:
        return None
    with db.conn() as c:
        return c.execute("SELECT * FROM orders WHERE token=?", (token,)).fetchone()


def room_messages(order_id: str):
    with db.conn() as c:
        return c.execute("SELECT sender, body, created_at, flagged FROM messages WHERE order_id=? ORDER BY id",
                         (order_id,)).fetchall()


def render_room(request: Request, o, error=None, status=200, reported=False):
    o = refresh_payment(o)
    reading_html = safe_markdown(o["reading_text"], ("extra", "nl2br")) if o["reading_text"] else ""
    return render(request, "room.html", o=o, r=catalog.BY_ID.get(o["reading"]), f=catalog.format_by_id(o["format"]),
                  reading_html=reading_html, messages=room_messages(o["id"]), error=error, cal_path=cal_path(),
                  reported=reported, status=status)


@app.get("/room/{token}", response_class=HTMLResponse)
def room(request: Request, token: str):
    o = order_by_token(token)
    if not o:
        return render(request, "404.html", status=404)
    resp = render_room(request, o, reported=request.query_params.get("reported") == "1")
    resp.headers["Referrer-Policy"] = "no-referrer"
    resp.headers["X-Robots-Tag"] = "noindex"
    return resp


@app.post("/room/{token}/message", response_class=HTMLResponse)
def room_message(request: Request, token: str, body: str = Form(""), website: str = Form("")):
    o = order_by_token(token)
    if not o:
        return render(request, "404.html", status=404)
    body = clean(body, 2000)
    if website:
        return RedirectResponse(f"/room/{token}#messages", status_code=303)
    if o["status"] not in ("paid", "delivered"):
        return render_room(request, o, error="You can message Ash once your payment is confirmed.", status=400)
    if not body:
        return render_room(request, o, error="Please write a message first.", status=400)
    if too_many(request, "message", 10, 3600, site_limit=300):
        return render_room(request, o, error="You've sent several messages just now. Ash will reply soon.", status=429)
    with db.conn() as c:
        if db.is_blocked(c, o["email"], o["phone"]):
            return render_room(request, o, error="Messaging is closed for this reading.", status=403)
        c.execute("INSERT INTO messages(order_id, sender, body, flagged) VALUES (?,?,?,?)",
                  (o["id"], "client", body, 1 if looks_abusive(body) else 0))
    return RedirectResponse(f"/room/{token}#messages", status_code=303)


@app.post("/room/{token}/report", response_class=HTMLResponse)
def room_report(request: Request, token: str, body: str = Form(""), website: str = Form("")):
    """The client tells Ash about a problem, for example something said or shown on a call."""
    o = order_by_token(token)
    if not o:
        return render(request, "404.html", status=404)
    body = clean(body, 2000)
    if website or o["status"] not in ("paid", "delivered"):
        return RedirectResponse(f"/room/{token}", status_code=303)
    if not body:
        return render_room(request, o, error="Please tell us what happened.", status=400)
    if too_many(request, "report", 5, 3600, site_limit=100):
        return render_room(request, o, error="Thank you, your report has reached Ash.", status=429)
    with db.conn() as c:
        c.execute("INSERT INTO reports(order_id, body) VALUES (?,?)", (o["id"], body))
    log.warning("Report filed for order %s", o["id"])
    return RedirectResponse(f"/room/{token}?reported=1#report", status_code=303)


@app.get("/my-readings", response_class=HTMLResponse)
def my_readings(request: Request):
    return render(request, "my_readings.html")


@app.post("/webhooks/dodo")
async def dodo_webhook(request: Request):
    body = await request.body()
    try:
        event = dodo.verify_webhook(body, request.headers)
    except Exception as e:  # bad or missing signature
        log.warning("Rejected webhook: %s", e)
        return PlainTextResponse("invalid signature", status_code=401)
    etype = event.get("type", "")
    data = event.get("data") or {}
    order_id = str((data.get("metadata") or {}).get("order_id") or "")[:40]
    payment_id = data.get("payment_id")
    with db.conn() as c:
        if order_id and etype == "payment.succeeded":
            o = c.execute("SELECT * FROM orders WHERE id=?", (order_id,)).fetchone()
            if not o:
                log.warning("Payment %s names unknown order %s", payment_id, order_id)
                return {"ok": True}
            ok, why = dodo.paid_enough(data, o)
            if ok:
                # Only unpaid orders move to paid, so a repeated webhook can't undo "delivered".
                c.execute("""UPDATE orders SET status='paid', paid_at=datetime('now'), dodo_payment=?, pay_note=NULL
                             WHERE id=? AND status IN ('pending','failed','cancelled','review')""", (payment_id, order_id))
                log.info("Order %s -> paid", order_id)
            else:
                c.execute("UPDATE orders SET status='review', dodo_payment=?, pay_note=? WHERE id=? AND status IN "
                          "('pending','failed','cancelled')", (payment_id, why, order_id))
                log.warning("Order %s held for review: %s (payment %s)", order_id, why, payment_id)
        elif order_id and etype in {"payment.failed", "payment.cancelled"}:
            new = "failed" if etype == "payment.failed" else "cancelled"
            c.execute("UPDATE orders SET status=? WHERE id=? AND status='pending'", (new, order_id))
            log.info("Order %s -> %s", order_id, new)
        elif payment_id and (etype == "refund.succeeded" or etype in {"dispute.opened", "dispute.lost"}):
            new = "refunded" if etype == "refund.succeeded" else "disputed"
            c.execute("UPDATE orders SET status=? WHERE dodo_payment=?", (new, payment_id))
            log.warning("Payment %s -> %s", payment_id, new)
    return {"ok": True}


# ---------- join: free first reading + referrals ----------

@app.get("/r/{code}")
def referral_link(code: str):
    return RedirectResponse(f"/join?ref={quote(code.upper())}", status_code=302)


@app.get("/join", response_class=HTMLResponse)
def join_form(request: Request, ref: str = ""):
    return render(request, "join.html", nav_page="join", form={"ref": clean(ref, 12).upper()}, error=None)


@app.post("/join", response_class=HTMLResponse)
def join_submit(request: Request, name: str = Form(""), email: str = Form(""), phone: str = Form(""),
                birthday: str = Form(""), question: str = Form(""), ref: str = Form(""),
                agree: str = Form(""), website: str = Form("")):
    form = dict(name=clean(name, 80), email=clean(email, 120), phone=clean(phone, 25),
                birthday=clean(birthday, 10), question=clean(question, 1500), ref=clean(ref, 12).upper())

    def fail(msg):
        return render(request, "join.html", nav_page="join", form=form, error=msg, status=400)

    if website:
        return fail("Something went wrong. Please try again.")
    if not form["name"] or not EMAIL_RE.match(form["email"]) or not PHONE_RE.match(form["phone"]):
        return fail("Please enter your name, a valid email and a mobile number.")
    if not valid_birthday(form["birthday"]):
        return fail("Please enter your date of birth. Ash only reads for adults 18 and over.")
    if agree != "yes":
        return fail("Please agree to receive messages from Ash so she can send your reading.")
    if too_many(request, "join", 5, 3600, site_limit=300):
        return fail("Too many sign-ups from here. Please try again later.")
    with db.conn() as c:
        ekey, pkey = db.email_key(form["email"]), db.phone_key(form["phone"])
        if db.is_blocked(c, form["email"], form["phone"]):
            return fail("We can't register these details. Please contact Ash if you think this is a mistake.")
        # One person, one free reading: an email or mobile number can only ever belong to one member.
        dup = c.execute("SELECT referral_code FROM members WHERE email_key=? OR phone_key=?", (ekey, pkey)).fetchone()
        if dup:
            return fail("This email or mobile number is already registered, and the free first reading is "
                        "once per person. You can still book a reading any time.")
        referrer = None
        if form["ref"]:
            referrer = c.execute("SELECT id, referral_code FROM members WHERE referral_code=?", (form["ref"],)).fetchone()
        code = db.new_code(c)
        c.execute("""INSERT INTO members(name, email, phone, birthday, referral_code, referred_by, free_question,
                                         email_key, phone_key) VALUES (?,?,?,?,?,?,?,?,?)""",
                  (form["name"], form["email"], form["phone"], form["birthday"], code, 
                   referrer["referral_code"] if referrer else None, form["question"] or None, ekey, pkey))
        if referrer:
            c.execute("UPDATE members SET referral_credits = referral_credits + 1 WHERE id=?", (referrer["id"],))
    share = f"{settings.SITE_URL}/r/{code}"
    return render(request, "joined.html", nav_page="join", name=form["name"], code=code, share=share)


# ---------- daily card & stories (with comments) ----------

@app.get("/daily-card", response_class=HTMLResponse)
def daily_card(request: Request):
    card = tarot.card_of_the_day()
    return render(request, "daily.html", nav_page="daily", card=card,
                  comments=comments_for(f"daily:{card['date'].isoformat()}"), error=None)


@app.post("/daily-card", response_class=HTMLResponse)
def daily_comment(request: Request, name: str = Form(""), body: str = Form(""), website: str = Form("")):
    card = tarot.card_of_the_day()
    err = add_comment(request, f"daily:{card['date'].isoformat()}", name, body, website)
    if err:
        return render(request, "daily.html", nav_page="daily", card=card, status=400,
                      comments=comments_for(f"daily:{card['date'].isoformat()}"), error=err)
    return RedirectResponse("/daily-card#comments", status_code=303)


@app.get("/practice", response_class=HTMLResponse)
def practice(request: Request):
    return render(request, "practice.html", nav_page="practice", deck=tarot.DECK,
                  comments=comments_for("practice"), error=None)


@app.post("/practice", response_class=HTMLResponse)
def practice_comment(request: Request, name: str = Form(""), body: str = Form(""), website: str = Form("")):
    err = add_comment(request, "practice", name, body, website)
    if err:
        return render(request, "practice.html", nav_page="practice", deck=tarot.DECK, status=400,
                      comments=comments_for("practice"), error=err)
    return RedirectResponse("/practice#comments", status_code=303)


# ---------- reviews (shown once Ash approves them) ----------

def approved_reviews(limit: int = 100):
    with db.conn() as c:
        return c.execute("SELECT name, reading, body, created_at FROM reviews WHERE approved=1 ORDER BY id DESC LIMIT ?",
                         (limit,)).fetchall()


@app.get("/reviews", response_class=HTMLResponse)
def reviews(request: Request, sent: int = 0):
    return render(request, "reviews.html", nav_page="reviews", reviews=approved_reviews(), error=None, sent=bool(sent))


@app.post("/reviews", response_class=HTMLResponse)
def review_submit(request: Request, name: str = Form(""), reading: str = Form(""), body: str = Form(""),
                  consent: str = Form(""), website: str = Form("")):
    if website:
        return RedirectResponse("/reviews?sent=1", status_code=303)
    name, body = clean(name, 60), clean(body, 1200)
    reading_name = catalog.BY_ID[reading]["name"] if reading in catalog.BY_ID else ""
    err = None
    if not name or not body:
        err = "Please add your name and a few words about your reading."
    elif not consent:
        err = "Please tick the box so Ash may publish your words."
    elif too_many(request, "review", 3, 3600, site_limit=100):
        err = "Thank you, we already have your review. Please try again later."
    if err:
        return render(request, "reviews.html", nav_page="reviews", reviews=approved_reviews(), error=err, sent=False,
                      status=400)
    with db.conn() as c:
        c.execute("INSERT INTO reviews(name, reading, body) VALUES (?,?,?)", (name, reading_name, body))
    return RedirectResponse("/reviews?sent=1", status_code=303)


@app.get("/stories", response_class=HTMLResponse)
def stories(request: Request):
    return render(request, "stories.html", nav_page="stories", stories=load_stories())


@app.get("/stories/{slug}", response_class=HTMLResponse)
def story(request: Request, slug: str):
    st = next((x for x in load_stories() if x["slug"] == slug), None)
    if not st:
        return render(request, "404.html", status=404)
    return render(request, "story.html", nav_page="stories", st=st, comments=comments_for(f"story:{slug}"), error=None)


@app.post("/stories/{slug}", response_class=HTMLResponse)
def story_comment(request: Request, slug: str, name: str = Form(""), body: str = Form(""), website: str = Form("")):
    st = next((x for x in load_stories() if x["slug"] == slug), None)
    if not st:
        return render(request, "404.html", status=404)
    err = add_comment(request, f"story:{slug}", name, body, website)
    if err:
        return render(request, "story.html", nav_page="stories", st=st, status=400,
                      comments=comments_for(f"story:{slug}"), error=err)
    return RedirectResponse(f"/stories/{slug}#comments", status_code=303)


# ---------- admin ----------

def admin_stamp() -> str:
    """Changes whenever the admin password changes, so changing it signs out every browser."""
    return "admin:" + hashlib.sha256(("ea-admin|" + settings.ADMIN_PASSWORD).encode()).hexdigest()[:24]


def is_admin(request: Request) -> bool:
    tok = request.cookies.get("ea_admin")
    if not tok or not settings.ADMIN_PASSWORD:
        return False
    try:
        return hmac.compare_digest(str(signer.loads(tok, max_age=60 * 60 * 24 * 7)), admin_stamp())
    except BadSignature:
        return False


@app.get("/admin", response_class=HTMLResponse)
def admin(request: Request):
    if not is_admin(request):
        return render(request, "admin_login.html", error=None)
    return render(request, "admin.html", **admin_context())


def lookalikes(members) -> dict:
    """Members who share a birthday and first name with someone else: maybe the same person with a new email."""
    groups = {}
    for m in members:
        first = (m["name"].split() or [""])[0].lower()
        groups.setdefault((m["birthday"], first), []).append(m)
    notes = {}
    for group in groups.values():
        if len(group) > 1:
            for m in group:
                others = ", ".join(o["name"] for o in group if o["id"] != m["id"])
                notes[m["id"]] = f"Same birthday and first name as {others}"
    return notes


def admin_context(pay_checks=None, pay_made=None) -> dict:
    with db.conn() as c:
        members = c.execute("SELECT * FROM members ORDER BY id DESC LIMIT 500").fetchall()
        orders = c.execute("""SELECT o.*, (SELECT COUNT(*) FROM messages m WHERE m.order_id=o.id AND m.sender='client'
                                  AND m.id > COALESCE((SELECT MAX(id) FROM messages a WHERE a.order_id=o.id AND a.sender='ash'), 0))
                                  AS waiting FROM orders o ORDER BY created_at DESC LIMIT 500""").fetchall()
        comments = c.execute("SELECT * FROM comments ORDER BY id DESC LIMIT 200").fetchall()
        reviews = c.execute("SELECT * FROM reviews ORDER BY approved, id DESC LIMIT 200").fetchall()
        reports = c.execute("""SELECT r.*, o.name, o.token FROM reports r LEFT JOIN orders o ON o.id=r.order_id
                               ORDER BY r.resolved, r.id DESC LIMIT 200""").fetchall()
        blocked = c.execute("SELECT * FROM blocked ORDER BY id DESC").fetchall()
        today = datetime.date.today()
        bdays = sorted([m for m in c.execute("SELECT * FROM members").fetchall()
                        if m["birthday"][5:7] == f"{today.month:02d}"], key=lambda m: m["birthday"][8:10])
    return dict(members=members, lookalikes=lookalikes(members), orders=orders, comments=comments, birthdays=bdays, reviews=reviews,
                reports=reports, blocked=blocked,
                weak_password=len(settings.ADMIN_PASSWORD) < settings.ADMIN_PASSWORD_MIN,
                month=today.strftime("%B"), today_day=f"{today.day:02d}",
                pay_setup=payment_setup(), pay_checks=pay_checks, pay_error=dodo.last_error,
                pay_products=dodo.products_status(), pay_made=pay_made)


def payment_setup() -> list[dict]:
    """Which payment settings are filled in on Render (never their values)."""
    rows = [{"name": "DODO_PAYMENTS_API_KEY", "ok": bool(settings.DODO_API_KEY)}]
    if not dodo.products_status()[0]:
        # Only needed when the reading products haven't been created from the admin.
        rows += [{"name": "DODO_PRODUCT_INR", "ok": bool(settings.DODO_PRODUCT_INR)},
                 {"name": "DODO_PRODUCT_USD", "ok": bool(settings.DODO_PRODUCT_USD)}]
    rows += [{"name": "DODO_PAYMENTS_WEBHOOK_KEY", "ok": bool(settings.DODO_WEBHOOK_SECRET)},
             {"name": "SITE_URL", "ok": settings.SITE_URL.startswith("https://")}]
    return rows


@app.post("/admin/payments/create-products", response_class=HTMLResponse)
def admin_create_products(request: Request):
    if not is_admin(request):
        return RedirectResponse("/admin", status_code=303)
    if not settings.DODO_API_KEY:
        made = {"made": 0, "done": 0, "needed": 0, "errors": ["Add DODO_PAYMENTS_API_KEY in Render first."]}
    else:
        made = dodo.create_products()
    return render(request, "admin.html", **admin_context(pay_made=made))


@app.post("/admin/payments/check", response_class=HTMLResponse)
def admin_payments_check(request: Request):
    if not is_admin(request):
        return RedirectResponse("/admin", status_code=303)
    checks = dodo.check_setup() if settings.DODO_API_KEY else [{"name": "API key", "ok": False, "detail": "Not set in Render"}]
    return render(request, "admin.html", **admin_context(pay_checks=checks))


@app.post("/admin/login", response_class=HTMLResponse)
def admin_login(request: Request, password: str = Form("")):
    # Per visitor, and for the whole site so guessing from many faked addresses is slow too.
    if too_many(request, "login", 8, 900, site_limit=40):
        return render(request, "admin_login.html", error="Too many attempts. Wait 15 minutes.", status=429)
    if not settings.ADMIN_PASSWORD or not hmac.compare_digest(password.encode(), settings.ADMIN_PASSWORD.encode()):
        log.warning("Failed admin login from %s", request.client.host if request.client else "?")
        return render(request, "admin_login.html", error="Wrong password.", status=401)
    resp = RedirectResponse("/admin", status_code=303)
    resp.set_cookie("ea_admin", signer.dumps(admin_stamp()), httponly=True, samesite="strict",
                    secure=settings.SITE_URL.startswith("https"), max_age=60 * 60 * 24 * 7)
    return resp


@app.post("/admin/logout")
def admin_logout():
    resp = RedirectResponse("/admin", status_code=303)
    resp.delete_cookie("ea_admin", samesite="strict", secure=settings.SITE_URL.startswith("https"), httponly=True)
    return resp


@app.post("/admin/comments/{cid}/hide")
def admin_hide_comment(request: Request, cid: int):
    if not is_admin(request):
        return RedirectResponse("/admin", status_code=303)
    with db.conn() as c:
        c.execute("UPDATE comments SET hidden = 1 - hidden WHERE id=?", (cid,))
    return RedirectResponse("/admin#comments", status_code=303)


@app.post("/admin/reviews/{rid}/approve")
def admin_review_approve(request: Request, rid: int):
    if not is_admin(request):
        return RedirectResponse("/admin", status_code=303)
    with db.conn() as c:
        c.execute("UPDATE reviews SET approved = 1 - approved WHERE id=?", (rid,))
    return RedirectResponse("/admin#reviews", status_code=303)


@app.post("/admin/reviews/{rid}/delete")
def admin_review_delete(request: Request, rid: int):
    if not is_admin(request):
        return RedirectResponse("/admin", status_code=303)
    with db.conn() as c:
        c.execute("DELETE FROM reviews WHERE id=?", (rid,))
    return RedirectResponse("/admin#reviews", status_code=303)


@app.post("/admin/members/{mid}/free-done")
def admin_free_done(request: Request, mid: int):
    if not is_admin(request):
        return RedirectResponse("/admin", status_code=303)
    with db.conn() as c:
        c.execute("UPDATE members SET free_status = CASE free_status WHEN 'done' THEN 'requested' ELSE 'done' END WHERE id=?", (mid,))
    return RedirectResponse("/admin#members", status_code=303)


@app.get("/admin/orders/{oid}", response_class=HTMLResponse)
def admin_order(request: Request, oid: str, saved: int = 0):
    if not is_admin(request):
        return RedirectResponse("/admin", status_code=303)
    with db.conn() as c:
        o = c.execute("SELECT * FROM orders WHERE id=?", (oid,)).fetchone()
    if not o:
        return render(request, "404.html", status=404)
    with db.conn() as c:
        reports = c.execute("SELECT * FROM reports WHERE order_id=? ORDER BY id DESC", (oid,)).fetchall()
        blocked = db.is_blocked(c, o["email"], o["phone"])
    return render(request, "admin_order.html", o=o, r=catalog.BY_ID.get(o["reading"]), f=catalog.format_by_id(o["format"]),
                  messages=room_messages(oid), saved=bool(saved), reports=reports, blocked=blocked)


@app.post("/admin/orders/{oid}/confirm-payment")
def admin_confirm_payment(request: Request, oid: str):
    """For a payment held for checking: Ash has looked in Dodo and it's right."""
    if not is_admin(request):
        return RedirectResponse("/admin", status_code=303)
    with db.conn() as c:
        c.execute("UPDATE orders SET status='paid', paid_at=COALESCE(paid_at, datetime('now')), pay_note=NULL "
                  "WHERE id=? AND status='review'", (oid,))
    return RedirectResponse(f"/admin/orders/{oid}", status_code=303)


@app.post("/admin/orders/{oid}/block")
def admin_block(request: Request, oid: str, reason: str = Form("")):
    """Blocks this client from booking, joining or messaging again (by email and mobile)."""
    if not is_admin(request):
        return RedirectResponse("/admin", status_code=303)
    with db.conn() as c:
        o = c.execute("SELECT * FROM orders WHERE id=?", (oid,)).fetchone()
        if o and not db.is_blocked(c, o["email"], o["phone"]):
            c.execute("INSERT INTO blocked(email_key, phone_key, name, reason) VALUES (?,?,?,?)",
                      (db.email_key(o["email"]), db.phone_key(o["phone"]), o["name"], clean(reason, 300)))
    return RedirectResponse(f"/admin/orders/{oid}", status_code=303)


@app.post("/admin/blocked/{bid}/remove")
def admin_unblock(request: Request, bid: int):
    if not is_admin(request):
        return RedirectResponse("/admin", status_code=303)
    with db.conn() as c:
        c.execute("DELETE FROM blocked WHERE id=?", (bid,))
    return RedirectResponse("/admin#safety", status_code=303)


@app.post("/admin/reports/{rid}/resolve")
def admin_resolve_report(request: Request, rid: int):
    if not is_admin(request):
        return RedirectResponse("/admin", status_code=303)
    with db.conn() as c:
        c.execute("UPDATE reports SET resolved = 1 - resolved WHERE id=?", (rid,))
    return RedirectResponse("/admin#safety", status_code=303)


@app.post("/admin/orders/{oid}/reading")
def admin_order_save(request: Request, oid: str, progress: str = Form("received"), reading_text: str = Form(""),
                     media_url: str = Form("")):
    if not is_admin(request):
        return RedirectResponse("/admin", status_code=303)
    progress = progress if progress in ("received", "reading", "ready") else "received"
    media_url = media_url.strip()[:500]
    if media_url and not media_url.startswith("https://"):
        media_url = ""
    with db.conn() as c:
        c.execute("""UPDATE orders SET progress=?, reading_text=?, media_url=?, updated_at=datetime('now'),
                     status = CASE WHEN ?='ready' AND status='paid' THEN 'delivered'
                                   WHEN ?!='ready' AND status='delivered' THEN 'paid' ELSE status END
                     WHERE id=?""", (progress, reading_text.strip()[:20000], media_url, progress, progress, oid))
    return RedirectResponse(f"/admin/orders/{oid}?saved=1", status_code=303)


@app.post("/admin/orders/{oid}/message")
def admin_order_message(request: Request, oid: str, body: str = Form("")):
    if not is_admin(request):
        return RedirectResponse("/admin", status_code=303)
    body = clean(body, 2000)
    if body:
        with db.conn() as c:
            c.execute("INSERT INTO messages(order_id, sender, body) VALUES (?,?,?)", (oid, "ash", body))
    return RedirectResponse(f"/admin/orders/{oid}#messages", status_code=303)


@app.post("/admin/orders/{oid}/done")
def admin_order_done(request: Request, oid: str):
    if not is_admin(request):
        return RedirectResponse("/admin", status_code=303)
    with db.conn() as c:
        c.execute("UPDATE orders SET status = CASE status WHEN 'delivered' THEN 'paid' ELSE 'delivered' END "
                  "WHERE id=? AND status IN ('paid','delivered')", (oid,))
    return RedirectResponse("/admin#orders", status_code=303)


@app.get("/admin/export/{table}.csv")
def admin_export(request: Request, table: str):
    if not is_admin(request) or table not in {"members", "orders"}:
        return Response(status_code=404)
    with db.conn() as c:
        rows = c.execute(f"SELECT * FROM {table} ORDER BY created_at").fetchall()
    buf = io.StringIO()
    w = csv.writer(buf)
    if rows:
        w.writerow(rows[0].keys())
        for row in rows:
            # Stop spreadsheet apps treating values as formulas.
            w.writerow([("'" + v) if isinstance(v, str) and v[:1] in "=+-@" else v for v in row])
    buf.seek(0)
    name = f"empressash-{table}-{datetime.date.today().isoformat()}.csv"
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv",
                             headers={"Content-Disposition": f'attachment; filename="{name}"'})


@app.get("/robots.txt", response_class=PlainTextResponse)
def robots():
    return "User-agent: *\nDisallow: /admin\nDisallow: /checkout\nAllow: /\n"


@app.get("/healthz", response_class=PlainTextResponse)
def health():
    return "ok"


@app.exception_handler(404)
async def not_found(request: Request, exc):
    return render(request, "404.html", status=404)
