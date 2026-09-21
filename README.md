# The Special Voice

Daily stories delivered as Ringless Voicemail (RVM) — subscription-based, powered by Next.js, Stripe, and TextP2P. Non-denominational: customers pick a male or female voice and Old Testament, New Testament, or both. 

---

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | Next.js (App Router, TypeScript) |
| Styling | Tailwind CSS v4 |
| Payments | Stripe Subscriptions + Webhooks |
| Database | Prisma + Neon Postgres (free tier) |
| Deployment | Vercel (+ Vercel Cron for daily delivery) |
| RVM Delivery | TextP2P.com API |

---

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Copy the template and fill in your values:

```bash
cp .env.local .env.local
```

Edit `.env.local`:

```env
# Neon.tech (or any Postgres) connection string
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"

# Stripe — get these from https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."         # from Stripe CLI or dashboard webhook

# Stripe Price IDs — create products in Stripe dashboard first (see below)
STRIPE_PRICE_ONCE_MONTHLY="price_..."
STRIPE_PRICE_TWICE_MONTHLY="price_..."
STRIPE_PRICE_THRICE_MONTHLY="price_..."

# Public
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# TextP2P (ringless voicemail) — leave DRY_RUN=true until live test passes
TEXTP2P_API_KEY=""
TEXTP2P_ACCOUNT_ID=""
TEXTP2P_CALLER_ID=""   # optional: toll-free / virtual number (digits only)
DRY_RUN="true"

# Story audio storage — S3 or any S3-compatible provider (e.g. Cloudflare R2).
# Leave S3_ENDPOINT blank for AWS S3; set it to the account endpoint for R2.
S3_BUCKET=""
S3_REGION="us-east-1"
S3_ENDPOINT=""             # blank for AWS S3
S3_ACCESS_KEY_ID=""
S3_SECRET_ACCESS_KEY=""
S3_PUBLIC_BASE_URL=""      # custom domain or R2 public bucket URL

# Admin pages at /admin (subscribers, story library, voice test)
ADMIN_SECRET="change-me"
ADMIN_PHONE_BILL=""
ADMIN_PHONE_ME=""

# Vercel Cron auth for the daily delivery job
CRON_SECRET="change-me"
```

### 3. Set up Neon Postgres

1. Create a free account at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string into `DATABASE_URL`

### 4. Run database migrations

```bash
npx prisma migrate dev --name init
```

> **Windows + Node v25 note:** Prisma's schema-engine binary (and Next.js's
> Turbopack binary) can crash with `STATUS_HEAP_CORRUPTION` on Node v25.x on
> Windows. If `prisma migrate dev`/`db push` or `next build` crash with exit
> code `-1073740940`, switch to a Node LTS release (20/22/24) with `nvm use
> 22` and retry — this is an environment issue, not a project bug. Vercel's
> Linux build environment is unaffected.

### 5. Create Stripe Products

In your [Stripe Dashboard](https://dashboard.stripe.com/products):

Create one product per plan (monthly only):

| Product Name | Frequency | Monthly Price |
|---|---|---|
| The Special Voice — Once Daily | 1x/day | $12.95/mo |
| The Special Voice — Twice Daily | 2x/day | $19.95/mo |
| The Special Voice — Three Times Daily | 3x/day | $24.95/mo |

Copy each Price ID into your `.env.local`. Trial length is set in code per plan
(9 / 6 / 3 days for once / twice / thrice). Do not attach a free trial on the
Stripe Price itself — the app passes `trial_period_days` at Checkout. A card is
required to start; the first charge happens when that plan's trial ends unless
the customer cancels.

### 6. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 7. Test Stripe webhooks locally

Install the [Stripe CLI](https://stripe.com/docs/stripe-cli) then run:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET`.

---

## Story Audio Storage (S3 / R2)

Story audio lives in an S3-compatible bucket, not in the repo. TextP2P fetches
each clip over plain HTTPS with no credentials, so the `audio/` prefix must be
publicly readable.

### 1. Create the bucket

AWS S3: create a bucket, disable "Block all public access", and leave
`S3_ENDPOINT` blank. Cloudflare R2: create a bucket, enable the public
r2.dev URL (or attach a custom domain), set `S3_REGION="auto"`, and set
`S3_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com"`.

### 2. Allow public read on the audio prefix

AWS bucket policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadAudio",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR_BUCKET/audio/*"
    }
  ]
}
```

R2 public buckets are readable once the public URL is enabled — no policy needed.

### 3. Allow browser uploads (CORS)

`/admin/content` uploads straight from the browser to the bucket with a
presigned `PUT`, so the bucket needs CORS for each origin you upload from:

```json
[
  {
    "AllowedOrigins": ["https://thespecialvoice.com", "http://localhost:3000"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

Without this, uploads fail in the browser with an opaque CORS error while
`curl` against the same presigned URL succeeds.

### 4. Credentials

Create an access key limited to `s3:PutObject`, `s3:GetObject` and
`s3:DeleteObject` on `YOUR_BUCKET/audio/*`, then set `S3_ACCESS_KEY_ID` and
`S3_SECRET_ACCESS_KEY`. Set `S3_PUBLIC_BASE_URL` to the public read base
(custom domain, r2.dev URL, or `https://YOUR_BUCKET.s3.REGION.amazonaws.com`).

### 5. Finish the cutover

The database is already the source of truth for story content, but the audio
files have not moved yet — the existing `Clip` rows still point at
`/audio/...` on the app itself. Once the bucket is set up:

1. `npm run import-content -- --dry-run` and check the output.
2. `npm run import-content` to upload the 26 files and repoint every `Clip`
   row at its bucket URL.
3. Open `/admin/test` and send one real RVM (with `DRY_RUN=false`) to confirm
   TextP2P will fetch audio from the bucket domain. This is the one step that
   cannot be verified any other way.
4. Only then delete `public/audio/`, and drop the now-unused
   `Customer.storyIndex` column in a follow-up migration. Both are kept for
   now precisely so step 2 can be re-run if step 3 fails.

`public/audio` is **not** managed from the admin UI. Delivery reads the URLs on
each `Clip`, never the filesystem, so those 26 files are purely a one-time
import. `/admin/content` counts any clip still pointing at `/audio/...` and
shows a plain-language banner until step 2 has been run, which is the signal
that deleting the folder is still unsafe. The onboarding voice preview reads
the welcome clip from the database through `/api/welcome-audio`, so it keeps
working after the folder is gone.

---

## Voice, Testament & Delivery

- Customers choose a **male (David)** or **female (Sarah)** voice and **Old
  Testament / New Testament / Both** during onboarding, with an in-browser
  audio preview of each voice.
- Story content lives in the database, not in the repo. A **`Story`** groups
  the **`Clip`** rows recorded for it (takes and parts), each clip holding one
  public audio URL per voice. Audio files sit in the S3-compatible bucket
  described above.
- Delivery order lives in **`Track`** / **`TrackItem`**: one ordered track per
  reading plan (`new`, `old`, `both`). A clip can belong to more than one
  track, so a New Testament clip appears in both the `new` and `both` tracks.
- Every send is written to **`Delivery`**, unique on `[customerId, clipId]`.
  That single constraint does three jobs: it is the duplicate-send guard, it
  is the compliance audit log, and it is how a customer's position is
  derived — the next clip is the lowest-position live clip in their track that
  they have never successfully received. **Adding or reordering content
  therefore cannot shift an existing subscriber.** A failed send is recorded
  with `ok: false` and retried on the next run rather than skipped.
- Trial-end and charge-start narration is **not** a fixed slot in the
  sequence. Clips are tagged with a `role` (`story`, `welcome`, `trialEnd`,
  `chargeStart`) and the engine injects the right one based on the customer's
  own `trialEndsAt`, which is what makes the tiered 9 / 6 / 3 day trials land
  the narration on the correct day.
- [`lib/content.ts`](lib/content.ts) owns the catalogue and sequencing;
  [`lib/delivery.ts`](lib/delivery.ts) owns sending and is shared by the cron
  job and the manual deliver route.
- [`lib/textp2p.ts`](lib/textp2p.ts) wraps the TextP2P ringless-voicemail API.
  While `DRY_RUN=true` (the default), sends are only logged — no real
  voicemail goes out. Set `DRY_RUN=false` after a successful live test from
  `/admin/test`. Optional `TEXTP2P_CALLER_ID` sets the callback / missed-call
  number on each drop.
- Clips are **`.mp3`**, served at public HTTPS URLs. Cleveribility's TextP2P
  account accepts MP3. Keep each clip under ~1 minute and ~1 MB.
- [`app/api/deliver/route.ts`](app/api/deliver/route.ts) sends the next
  story/stories to one customer or all active/trial customers, protected by
  `CRON_SECRET`. Pass `{ "preview": true }` to see which clips are next
  without sending anything or recording a delivery.
- [`app/api/cron/daily/route.ts`](app/api/cron/daily/route.ts) is called
  automatically by Vercel Cron (see [`vercel.json`](vercel.json)) once a day
  to deliver to every active/trial customer. It logs a warning when the
  tightest subscriber runway drops to three days or fewer.
- **`/admin/content`** — the story library. See below.
- **`/admin/test`** — voice QA. Preview every clip in the library per voice and
  send real test RVM drops to `ADMIN_PHONE_BILL` / `ADMIN_PHONE_ME`. Test sends
  never touch a customer's place in the sequence.
- **`/admin/subscribers`** — see below.

### The admin shell

Every `/admin` route is wrapped by [`app/admin/layout.tsx`](app/admin/layout.tsx),
which renders the passphrase gate and the nav once instead of per page. Unlock
with `ADMIN_SECRET` on any admin URL and the session covers all of them;
**Lock** in the header ends it. `/api/admin/verify` sets the signed httpOnly
cookie (`POST`), reports whether it is still valid (`GET`), and clears it
(`DELETE`). The gate is convenience only — every admin API route independently
calls `requireAdmin`, so the cookie is what actually authorises data access.

Live admin routes: **`/admin`** (hub), **`/admin/subscribers`**,
**`/admin/content`**, **`/admin/test`**.

### Managing content

**`/admin/content`** is split into three tabs under a shared header showing how
much content is left (in days, not clip counts) plus any storage warnings:

| Tab | What it is for |
|-----|----------------|
| **Library** | Browse stories grouped by number, see at a glance whether David and Sarah are both recorded, play either take, and move a recording between Ready / Draft / Archived |
| **Add story** | Three steps — which story, the recordings, then publish — with take, part label, and role tucked behind Advanced |
| **Playback order** | The order one track's subscribers hear stories in, reordered by drag or arrow buttons |

The UI deliberately avoids the database's vocabulary. `live` reads as
**Ready**, `retired` as **Archived**, and the voices are **David** and
**Sarah** rather than male and female. Uploads still go straight from the
browser to the bucket with a presigned `PUT`, so audio never passes through
the server, and a clip can't be marked Ready until it has at least one
recording. The Library can also fill in a missing voice later: the same
create-or-update endpoint only overwrites the voice being sent, so adding
Sarah months after David leaves his take untouched.

### Managing subscribers

**`/admin/subscribers`** is the operations view of the customer base: status
counts, search by name / email / phone, and filter by status. **Manage** opens
**`/admin/subscribers/[id]`** — a dedicated page to correct their name, email,
phone, and voice, move their reading track, change their plan, and inspect
their recent deliveries plus how much content they have left.

Three actions reach past the database:

| Action | Effect |
|--------|--------|
| Change plan | Re-prices the Stripe subscription with prorations **and** updates `planId` / `frequency`, so billing and delivery cadence can't drift apart |
| Cancel | Sets Stripe `cancel_at_period_end` and marks the customer `cancelled` |
| Send next now | Runs the real delivery engine for that one person; **Preview next** shows the same sequence without contacting TextP2P or writing `Delivery` rows |

Pause and resume only change the local `status`, deliberately leaving billing
alone so a short pause never cancels a subscription. Paused, cancelled, and
opted-out customers are skipped by the daily cron. Opted-out subscribers cannot
be sent to at all; the detail page shows a STOP banner and clearing it is a
deliberate, separate action.

Plan definitions still live in [`lib/plans.ts`](lib/plans.ts) plus the Stripe
Price IDs in env — the subscribers page assigns those plans, it does not define
them. Plan changes made by the customer in the Stripe billing portal flow back
via `customer.subscription.updated`, which maps the new price to a plan and
resyncs `frequency`.

### Managing content

```bash
# One-time: move public/audio + the frozen manifest into the bucket and the DB
npm run import-content -- --dry-run     # report only
npm run import-content                  # upload and write rows
npm run import-content -- --skip-upload # DB rows only, keep /audio/... URLs

# Regression check on the sequencing (creates and deletes a test customer)
npm run verify-delivery
```

Day to day, content is added through `/admin/content` — no deploy required.

---

## Project Structure

```
app/
  page.tsx                  ← Landing page (Hero, How It Works, Pricing, FAQ)
  checkout/page.tsx         ← Plan selection + Stripe checkout redirect
  onboarding/page.tsx       ← Post-payment setup: name, phone, voice, testament, frequency
  portal/page.tsx           ← Customer self-service portal
  admin/layout.tsx          ← Shared admin shell: one passphrase gate + nav
  admin/page.tsx            ← Admin hub linking the tools below
  admin/subscribers/page.tsx← Subscriber list: search, filter, status counts
  admin/subscribers/[id]/page.tsx ← Manage one subscriber: prefs, plan, pause/cancel, history
  admin/test/page.tsx       ← Voice QA + test RVM sends
  admin/content/page.tsx    ← Story library shell: Library / Add story / Order tabs
  admin/content/_components/← Runway strip, setup notices, and the three tabs
  api/
    subscribe/route.ts      ← Creates Stripe checkout session
    stripe/webhook/route.ts ← Handles Stripe webhook events
    customer/route.ts       ← Customer CRUD
    portal/route.ts         ← Stripe Billing Portal redirect
    deliver/route.ts        ← Sends next stor(y/ies) to one customer or all (CRON_SECRET)
    cron/daily/route.ts     ← Vercel Cron daily delivery job
    admin/verify/route.ts   ← Passphrase check + session cookie (ADMIN_SECRET)
    admin/send-test/route.ts← Test RVM send to Bill/you (ADMIN_SECRET)
    admin/content/          ← Story list + runway, presigned uploads,
                              clip create/update/delete, track reorder
    admin/customers/        ← Subscriber list, detail + actions, per-customer
                              deliver/preview (ADMIN_SECRET)
    welcome-audio/route.ts  ← Public welcome clip URLs for the voice preview

components/
  Navbar.tsx
  Hero.tsx
  TrustBar.tsx
  HowItWorks.tsx
  PricingTable.tsx          ← Monthly pricing (Once/Twice/Three Times Daily)
  Testimonials.tsx
  FAQ.tsx
  BottomCTA.tsx
  Footer.tsx

lib/
  stripe.ts                 ← Stripe SDK singleton
  prisma.ts                 ← Prisma Client singleton
  plans.ts                  ← Pricing plans, price IDs, helpers
  content.ts                ← Story catalogue, track ordering, sequencing, runway
  delivery.ts               ← Shared delivery engine (cron + manual route)
  storage.ts                ← S3-compatible client, presigned uploads
  admin-auth.ts             ← Shared ADMIN_SECRET check + session cookie
  textp2p.ts                ← TextP2P RVM API client (DRY_RUN aware)

scripts/
  import-existing-content.ts← One-time public/audio + manifest -> bucket + DB
  legacy-manifest.ts        ← Frozen snapshot of the old lib/stories.ts
  verify-delivery.ts        ← Sequencing regression check

prisma/
  schema.prisma             ← Customer, Consent, Story, Clip, Track, TrackItem, Delivery

public/audio/               ← Legacy clips, kept until the bucket import is
  male/                       verified in production, then deleted
  female/
```

---

## Deployment to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USER/specialvoice.git
git push -u origin main
```

### 2. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repo
3. Add all environment variables from `.env.local` to Vercel's **Environment Variables** settings
4. Deploy — Vercel automatically runs the `vercel-build` script
   (`prisma migrate deploy && next build`), which applies any pending
   migrations in `prisma/migrations/` to your production database before
   building. No manual migration step needed.

### 3. Add Stripe Webhook (production)

1. In Stripe Dashboard → **Webhooks** → **Add endpoint**
2. URL: `https://thespecialvoice.com/api/stripe/webhook`
3. Events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `invoice.payment_succeeded`
4. Copy the signing secret → `STRIPE_WEBHOOK_SECRET` in Vercel

---

## Go live with TextP2P RVM (Phase 1)

Daily delivery runs via Vercel Cron at **14:00 UTC** ([`vercel.json`](vercel.json)).
MMS is not enabled yet — RVM only.

### 1. Set Production env vars in Vercel

| Variable | Purpose |
|----------|---------|
| `TEXTP2P_API_KEY` | TextP2P Application page → `AUTH_USERNAME` |
| `TEXTP2P_ACCOUNT_ID` | TextP2P Application page → `AUTH_SECRET` |
| `TEXTP2P_CALLER_ID` | Optional caller ID (digits only, e.g. toll-free) |
| `NEXT_PUBLIC_APP_URL` | Public HTTPS site URL (Stripe redirects, opt-out links) |
| `S3_BUCKET` | Bucket holding story audio |
| `S3_REGION` | Bucket region (`auto` for R2) |
| `S3_ENDPOINT` | Blank for AWS S3; account endpoint for R2 |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | Bucket credentials |
| `S3_PUBLIC_BASE_URL` | Public read URL base — TextP2P fetches audio from here |
| `ADMIN_SECRET` | Passphrase for every `/admin` page |
| `ADMIN_PHONE_BILL` | Bill's test cell (digits, e.g. `7703287729`) |
| `ADMIN_PHONE_ME` | Your test cell (digits, e.g. `8438551695`) |
| `CRON_SECRET` | Protects daily cron + manual deliver route |
| `DRY_RUN` | Keep `true` until step 4 succeeds |

Do not attach a free trial on Stripe Prices — trial length is set in code per plan.

### 2. Deploy with `DRY_RUN=true`

Redeploy after saving env vars. Open `/admin/test`, enter `ADMIN_SECRET`, and
send a clip to Bill and yourself — status should show **(dry run)** and Vercel
logs should show `[textp2p][DRY_RUN] Would send RVM...`.

### 3. Confirm audio is publicly reachable

TextP2P must HTTP-fetch each clip with no credentials. Open a clip URL from
`/admin/content` in a private browser window — it should play. If the bucket
returns `AccessDenied`, the public-read policy on the `audio/` prefix is
missing and every delivery will fail silently at the provider.

### 4. Flip live and test again

Set `DRY_RUN=false` in Vercel → redeploy → send one clip each to Bill and you
from `/admin/test`. Confirm voicemails arrive. Check Vercel logs for
`[textp2p] RVM accepted HTTP 200`.

### 5. Monitor the daily cron

After the next 14:00 UTC run, check Vercel function logs for
`/api/cron/daily`. Trial and active customers who have completed onboarding
receive the next clip(s) at their plan frequency. The response and logs call
out two things worth watching: `outOfContent` lists anyone whose track ran dry
mid-run, and a `Content runway low` warning fires when the tightest subscriber
is within three days of the end of the library. The runway is also shown at
the top of `/admin/content`.

---

## Pointing GoDaddy Domain to Vercel

> Takes ~5–10 minutes. DNS propagation can take up to 48 hours.

### Option A: Use Vercel Nameservers (Recommended)

1. In Vercel: **Project Settings → Domains → Add `thespecialvoice.com`**
2. Vercel shows you two nameservers, e.g.:
   - `ns1.vercel-dns.com`
   - `ns2.vercel-dns.com`
3. In GoDaddy: **My Domains → DNS → Nameservers → Change → Enter Custom Nameservers**
4. Paste both Vercel nameservers → Save

### Option B: Add CNAME/A Records manually

1. In Vercel: Add domain → copy the provided **A record IP** and **CNAME value**
2. In GoDaddy DNS Manager:
   - Add **A record**: `@` → `76.76.21.21` (Vercel IP)
   - Add **CNAME**: `www` → `cname.vercel-dns.com`
3. In Vercel: Verify domain

---

## Subscription Plans

| Plan | Frequency | Monthly Price |
|---|---|---|
| Once Daily | 1x/day | $12.95 |
| Twice Daily | 2x/day | $19.95 |
| Three Times Daily | 3x/day | $24.95 |

Free trial by plan: 9 days (1/day), 6 days (2/day), or 3 days (3/day), at the
plan's delivery frequency. A card is required to start; the first charge happens
automatically when the trial ends unless cancelled.

---

## Phase 2 Roadmap

- Record additional stories beyond the current active sequence
- Old Testament content, then decide what the `both` track should interleave
- MMS add-on ($7.95) for subscribers who opt in — ~1 MMS per 5 RVM clips
- 10DLC / carrier compliance at scale
- Global delivery log at `/admin/deliveries` with retry for failed sends
- Dashboard widgets on `/admin`: cron summary, payment health, opted-out list
- Email welcome sequence via Resend or SendGrid
- Pause/resume delivery from the customer portal (admin can already do this)
- Cleveribility / pingyDING education content as a second delivery vertical
