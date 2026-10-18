# EmpressAsh mobile app

iPhone app (also runs on Android) for EmpressAsh, built with Expo (React Native). It uses the same look as the web app: misty slate-teal sky, drifting embers and snow, the cloud-and-reeds hero, Ash's greens, khaki and purples, IM Fell English and EB Garamond fonts, and the wand. On a phone the wand follows your finger with a warm light and a trail of sparks.

**Screens:** Home, Readings (16 spreads, INR or USD), each reading's detail page, Today's card (flip to reveal; the same card the website shows that day), The deck (all 78 cards with meanings), Contact, About Ash, Policies, How booking works.

The app has no account and no database of its own. Booking and "join the circle" open the website.

## How payments work

**Nothing is bought inside the app.** There is no Apple in-app purchase and no RevenueCat.

1. A client picks a spread and a live format (video or voice) in the app.
2. "Book this session" opens the website checkout (`/checkout/<spread>?format=video&currency=inr`) in Safari's in-app browser sheet.
3. The website takes their details and question, creates a Dodo Payments checkout and the client pays there. The money goes to whichever Dodo account the website's keys belong to, so use **Ash's own Dodo account** keys on Render.
4. After paying, the website sends them to Cal.com to pick a time, as it does today.

Only **live one-on-one sessions** (video and voice) are offered in the app. Written readings are left out on purpose (see below).

While live sessions are closed on the website (`LIVE_READINGS_OPEN=false`), keep `liveReadingsOpen: false` in [`src/config.ts`](src/config.ts). The app then shows "Opening soon" and invites people to join the circle for their free first reading. When live sessions open, set it to `true` and publish an update.

### Why this is allowed by Apple, and the risks

Checked against the [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) on 18 October 2026:

- **3.1.3(d) Person-to-Person Services:** "If your app enables the purchase of real-time person-to-person services between two individuals (for example tutoring students, medical consultations, real estate tours, or fitness training), you may use purchase methods other than in-app purchase to collect those payments. One-to-few and one-to-many real-time services must use in-app purchase." A live one-on-one reading with Ash fits this.
- **Written readings stay out of the app.** A written reading is not real-time, so Apple could treat it as digital content that needs in-app purchase (3.1.1). Don't add written readings, recorded readings, or group/live-stream sessions to the app without in-app purchase. They stay on the website only, and the app doesn't point to them.
- **Group sessions** (one-to-few or one-to-many) would need in-app purchase. Keep the app to one-on-one.
- **"Fortune telling" apps (4.3(b)):** Apple says it won't accept new fortune-telling apps "unless they offer a meaningfully different or improved experience". This is the biggest review risk. The app is a booking app for a real reader, with a native daily card and a deck guide rather than an automated fortune generator, and the review note below says so. If Apple still rejects it, the reply should stress that it books live sessions with a human practitioner.
- **Minimum functionality (4.2):** the app has its own native screens, not just the website in a frame. Keep it that way.

## Try it on your phone

1. Install **Expo Go** from the App Store on your iPhone.
2. On a computer with a current Node.js (LTS):
   ```bash
   cd EmpressAsh-MobileApp
   npm install
   npx expo start
   ```
3. Scan the QR code with the iPhone camera. The app opens in Expo Go.

To preview in a browser instead: `npx expo start --web`.

Before testing booking, set `siteUrl` in [`src/config.ts`](src/config.ts) to the live website address.

## Where to change things

| What | Where |
|---|---|
| Website address, live-sessions switch, email, WhatsApp, Instagram, YouTube | [`src/config.ts`](src/config.ts) |
| Readings, descriptions, prices | [`src/data/readings.ts`](src/data/readings.ts) (copied from `app/catalog.py` on the website; keep both in step) |
| Card meanings | [`src/data/tarot.ts`](src/data/tarot.ts) (same as `app/tarot.py`) |
| Colours and fonts | [`src/theme.ts`](src/theme.ts) |
| About, policies, home text | `src/app/about.tsx`, `src/app/policies.tsx`, `src/app/(tabs)/index.tsx` |
| App name, bundle ID, icon, splash | [`app.json`](app.json) and `assets/` |

The icon and splash screen are the EmpressAsh crescent moon on the night colour. There are no Expo logos left in `assets/`.

## Publish to the App Store

### 1. Apple Developer account
Use **Ash's own Apple Developer account** ($99/year, enrol at [developer.apple.com/programs](https://developer.apple.com/programs/)). The seller name on the App Store is the account holder. Ash then adds Meet under **Users and Access** in App Store Connect with the App Manager or Developer role, so Meet can build and upload. Payments don't go through Apple, so this is about whose name is on the listing and who owns the app.

### 2. Build and upload with EAS (no Mac needed)
```bash
cd EmpressAsh-MobileApp
npx eas-cli@latest login            # free Expo account
npx eas-cli@latest init             # links the project, adds its ID to app.json
npx eas-cli@latest build -p ios --profile production
npx eas-cli@latest submit -p ios --latest
```
EAS asks for the Apple ID and handles certificates. The bundle ID is `com.empressash.app` (change it in `app.json` before the first build if Ash prefers another).

To install a test build on a few phones before release, use `--profile preview` and register the devices when EAS asks, or send the production build to **TestFlight** after `submit`.

### 3. App Store Connect listing
- **Category:** Lifestyle.
- **Age rating:** answer the questionnaire and choose 18+ (Ash only reads for adults).
- **Privacy:** the app itself collects no data, so the privacy label is "Data Not Collected". Use the website's `/policies` page as the privacy policy URL.
- **Screenshots:** take them from Expo Go or a test build, at the iPhone sizes App Store Connect asks for.
- **Review notes** (paste into "Notes for the reviewer"):
  > EmpressAsh lets clients book live one-on-one video or voice tarot sessions with a single human reader, Ash. Under guideline 3.1.3(d) (person-to-person services), these real-time sessions are paid on our website through Dodo Payments; the app opens the booking page in the browser. No digital content is sold or unlocked in the app. The app also offers a free daily card and a guide to all 78 cards.

### 4. Updates
Changing text, prices or the live-sessions switch means a new build and submit (steps above). To push such changes straight to phones without a new review, set up over-the-air updates once with `npx expo install expo-updates` and `npx eas-cli@latest update:configure`, then publish with `npx eas-cli@latest update --branch production`.

## Checks

```bash
npx tsc --noEmit     # typecheck
npx expo export -p web   # makes sure the app bundles
```
