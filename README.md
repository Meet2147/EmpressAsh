# EmpressAsh website

Static website for EmpressAsh (tarot, oracle and energy readings with Ash). Plain HTML, CSS and JavaScript with no build step, hosted free on Render.

**Pages:** Home (with testimonials), About, Readings (15 spreads × 3 formats, INR and USD), Book, Contact, Policies.
**Booking:** Cal.com inline embed. **Payment:** Dodo Payments hosted checkout links, paid in full.
**Extras:** wand cursor that lights up what it touches (mouse only), a free first reading booked through its own Cal.com event, WhatsApp chat button, 18+ confirmation on first visit, currency picked automatically (INR in India, USD elsewhere) with a manual switch.

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Where to change things

Almost everything lives in [`js/config.js`](js/config.js):

| What | Key |
|---|---|
| Email, phone, WhatsApp number | `SITE.contact` |
| Instagram, YouTube | `SITE.social` |
| Cal.com booking link | `SITE.calDefault` (or per spread in `SITE.calEvents`) |
| Free first reading (Cal.com event) | `SITE.calFree` |
| Dodo checkout links | `SITE.dodo["<spread-id>:<video\|voice\|written>:<inr\|usd>"]` |
| Reading names, descriptions, durations, prices (`null` = on request) | `READINGS` |

Any value still containing `PLACEHOLDER` shows a "coming soon" message on the site instead of a broken link.

Text for About, testimonials and the refund policy is in the HTML files and marked with `PLACEHOLDER` comments. Colours are the tokens at the top of [`css/styles.css`](css/styles.css).

## Setting up the services

### Cal.com (free plan)
1. Create an account and an event type, e.g. `empressash/reading`.
2. Availability: Thursday to Sunday, 18:00–20:00 Asia/Kolkata.
3. Limits: minimum notice 7 days; booking frequency limit 5 per week.
4. Booking questions: full name and "Your question" (required).
5. Turn on email confirmations and reminders.
6. Create a second event for the free first reading, with required booking questions for email, mobile number and date of birth, and limit it to one booking per email. Put it in `SITE.calFree`.
7. Put the link in `SITE.calDefault`. If Ash wants exact durations per spread, create one event per duration and map them in `SITE.calEvents`.

### Dodo Payments
1. Confirm with Dodo that tarot/spiritual readings are allowed under their acceptable-use policy before going live.
2. Create a one-time product for each reading and format (45 products), each with an INR and a USD price, or 90 single-currency products.
3. Copy each product's hosted checkout link into `SITE.dodo`.
4. Set the success redirect to `https://<your-domain>/book.html?paid=1` if wanted.

Booking flow: the client picks a time on Cal.com, then pays the full amount through Dodo. Ash confirms the booking once payment arrives. Written readings skip the calendar; the client pays and sends their name and question on WhatsApp or email.

### Images
Put originals in `originals/` (git-ignored) and run:
```bash
scripts/compress-images.sh originals/*.jpg
```
This writes WebP files under 200 KB to `images/`. Keep video on YouTube to stay within Render's free 5 GB/month bandwidth.

## Deploy on Render (free)
1. In Render: **New → Blueprint**, pick this repo. `render.yaml` creates a free static site publishing the repo root.
2. Add the custom domain under the site's **Settings → Custom Domains** and point DNS as shown.
