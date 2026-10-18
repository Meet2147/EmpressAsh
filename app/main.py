"""EmpressAsh web app."""
import csv
import datetime
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

from . import catalog, db, dodo, settings, tarot

log = logging.getLogger("empressash")
logging.basicConfig(level=logging.INFO)

HERE = os.path.dirname(__file__)
STORIES_DIR = os.path.join(os.path.dirname(HERE), "content", "stories")

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
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
        nav_page=ctx.get("nav_page", ""),
        year=datetime.date.today().year,
    )
    return templates.TemplateResponse(request, template, ctx, status_code=status)


_hits: dict = defaultdict(deque)


def too_many(request: Request, bucket: str, limit: int, per_seconds: int) -> bool:
    """Small in-memory rate limit per visitor IP."""
    ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "?").split(",")[0].strip()
    q = _hits[(bucket, ip)]
    now = time.time()
    while q and q[0] < now - per_seconds:
        q.popleft()
    if len(q) >= limit:
        return True
    q.append(now)
    return False


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
    if too_many(request, "comment", 5, 600):
        return "You've commented a lot just now. Please try again in a few minutes."
    with db.conn() as c:
        c.execute("INSERT INTO comments(page, name, body) VALUES (?,?,?)", (page, name, body))
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
            "html": md.markdown(body.strip(), extensions=["extra"]),
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
def checkout_form(request: Request, slug: str, format: str = "written", currency: str = ""):
    r = catalog.BY_ID.get(slug)
    f = catalog.format_by_id(format)
    if not r or not f:
        return render(request, "404.html", status=404)
    return render(request, "checkout.html", nav_page="readings", r=r, f=f, error=None, form={})


@app.post("/checkout/{slug}", response_class=HTMLResponse)
def checkout_submit(request: Request, slug: str, format: str = Form(...), currency: str = Form("usd"),
                    name: str = Form(""), email: str = Form(""), phone: str = Form(""),
                    birthday: str = Form(""), question: str = Form(""), agree: str = Form("")):
    r = catalog.BY_ID.get(slug)
    f = catalog.format_by_id(format)
    if not r or not f:
        return render(request, "404.html", status=404)
    currency = "inr" if currency == "inr" else "usd"
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
    if not settings.payments_ready():
        return fail("Online payment is being set up. Please message Ash on WhatsApp or email to book for now.")
    if too_many(request, "checkout", 10, 600):
        return fail("Too many attempts. Please wait a few minutes and try again.")

    order_id = db.new_order_id()
    with db.conn() as c:
        c.execute("""INSERT INTO orders(id, reading, format, currency, amount, name, email, phone, birthday, question)
                     VALUES (?,?,?,?,?,?,?,?,?,?)""",
                  (order_id, r["id"], f["id"], currency, amount, form["name"], form["email"], form["phone"],
                   form["birthday"], form["question"]))
    try:
        session = dodo.create_checkout(order_id=order_id, product_name=f"{r['name']} · {f['label']}",
                                       amount_minor=amount * 100, currency=currency,
                                       name=form["name"], email=form["email"], phone=form["phone"])
    except dodo.PaymentError as e:
        log.error("Checkout failed for %s: %s", order_id, e)
        with db.conn() as c:
            c.execute("UPDATE orders SET status='failed' WHERE id=?", (order_id,))
        return fail("We couldn't start the payment just now. Please try again, or message Ash.")
    with db.conn() as c:
        c.execute("UPDATE orders SET dodo_session=? WHERE id=?", (session.get("session_id"), order_id))
    return RedirectResponse(session["checkout_url"], status_code=303)


@app.get("/thank-you", response_class=HTMLResponse)
def thank_you(request: Request, order: str = ""):
    with db.conn() as c:
        o = c.execute("SELECT * FROM orders WHERE id=?", (order,)).fetchone()
    if not o:
        return render(request, "404.html", status=404)
    status = o["status"]
    if status == "pending" and o["dodo_session"]:
        # The webhook usually arrives first; this is a fallback check.
        if dodo.session_status(o["dodo_session"]) == "succeeded":
            with db.conn() as c:
                c.execute("UPDATE orders SET status='paid', paid_at=datetime('now') WHERE id=? AND status='pending'", (o["id"],))
            status = "paid"
    r = catalog.BY_ID.get(o["reading"])
    f = catalog.format_by_id(o["format"])
    return render(request, "thank_you.html", o=o, r=r, f=f, pay_status=status)


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
    order_id = (data.get("metadata") or {}).get("order_id")
    if order_id and etype in {"payment.succeeded", "payment.failed", "payment.cancelled"}:
        new = {"payment.succeeded": "paid", "payment.failed": "failed", "payment.cancelled": "cancelled"}[etype]
        with db.conn() as c:
            if new == "paid":
                c.execute("UPDATE orders SET status='paid', paid_at=datetime('now'), dodo_payment=? WHERE id=?",
                          (data.get("payment_id"), order_id))
            else:
                c.execute("UPDATE orders SET status=? WHERE id=? AND status='pending'", (new, order_id))
        log.info("Order %s -> %s", order_id, new)
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
    if too_many(request, "join", 5, 3600):
        return fail("Too many sign-ups from here. Please try again later.")
    with db.conn() as c:
        digits = re.sub(r"\D", "", form["phone"])[-10:]
        dup = c.execute("SELECT referral_code FROM members WHERE email=? OR substr(replace(replace(replace(phone,' ',''),'-',''),'+',''), -10)=?",
                        (form["email"], digits)).fetchone()
        if dup:
            return fail("You've already joined, so your free first reading is on its way. Your referral code is "
                        f"{dup['referral_code']}.")
        referrer = None
        if form["ref"]:
            referrer = c.execute("SELECT id, referral_code FROM members WHERE referral_code=?", (form["ref"],)).fetchone()
        code = db.new_code(c)
        c.execute("""INSERT INTO members(name, email, phone, birthday, referral_code, referred_by, free_question)
                     VALUES (?,?,?,?,?,?,?)""",
                  (form["name"], form["email"], form["phone"], form["birthday"], code,
                   referrer["referral_code"] if referrer else None, form["question"] or None))
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
    elif too_many(request, "review", 3, 3600):
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

def is_admin(request: Request) -> bool:
    tok = request.cookies.get("ea_admin")
    if not tok or not settings.ADMIN_PASSWORD:
        return False
    try:
        return signer.loads(tok, max_age=60 * 60 * 24 * 7) == "admin"
    except BadSignature:
        return False


@app.get("/admin", response_class=HTMLResponse)
def admin(request: Request):
    if not is_admin(request):
        return render(request, "admin_login.html", error=None)
    with db.conn() as c:
        members = c.execute("SELECT * FROM members ORDER BY id DESC LIMIT 500").fetchall()
        orders = c.execute("SELECT * FROM orders ORDER BY created_at DESC LIMIT 500").fetchall()
        comments = c.execute("SELECT * FROM comments ORDER BY id DESC LIMIT 200").fetchall()
        reviews = c.execute("SELECT * FROM reviews ORDER BY approved, id DESC LIMIT 200").fetchall()
        today = datetime.date.today()
        bdays = sorted([m for m in c.execute("SELECT * FROM members").fetchall()
                        if m["birthday"][5:7] == f"{today.month:02d}"], key=lambda m: m["birthday"][8:10])
    return render(request, "admin.html", members=members, orders=orders, comments=comments, birthdays=bdays,
                  reviews=reviews, month=today.strftime("%B"), today_day=f"{today.day:02d}")


@app.post("/admin/login", response_class=HTMLResponse)
def admin_login(request: Request, password: str = Form("")):
    if too_many(request, "login", 8, 900):
        return render(request, "admin_login.html", error="Too many attempts. Wait 15 minutes.", status=429)
    if not settings.ADMIN_PASSWORD or not hmac.compare_digest(password, settings.ADMIN_PASSWORD):
        return render(request, "admin_login.html", error="Wrong password.", status=401)
    resp = RedirectResponse("/admin", status_code=303)
    resp.set_cookie("ea_admin", signer.dumps("admin"), httponly=True, samesite="strict",
                    secure=settings.SITE_URL.startswith("https"), max_age=60 * 60 * 24 * 7)
    return resp


@app.post("/admin/logout")
def admin_logout():
    resp = RedirectResponse("/admin", status_code=303)
    resp.delete_cookie("ea_admin")
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
