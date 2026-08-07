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

# TextP2P (ringless voicemail) — leave DRY_RUN=true until your account is approved
TEXTP2P_API_KEY=""
TEXTP2P_ACCOUNT_ID=""
DRY_RUN="true"

# Admin quality-check page at /admin/test
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

Copy each Price ID into your `.env.local`. All plans use a 10-day free trial — a
card is required to start (Stripe `trial_period_days: 10`), and the first
charge happens automatically on day 11 unless the customer cancels.

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

## Voice, Testament & Delivery

- Customers choose a **male (David)** or **female (Sarah)** voice and **Old
  Testament / New Testament / Both** during onboarding, with an in-browser
  audio preview of each voice.
- Recorded story clips live in [`public/audio/male/`](public/audio/male) and
  [`public/audio/female/`](public/audio/female), served publicly at
  `https://yourdomain.com/audio/{male|female}/<file>.mp3`.
- [`lib/stories.ts`](lib/stories.ts) is the master manifest — it lists every
  recorded clip, flags which take is used in the live delivery sequence
  (`active: true`), and marks the clip that ends the free trial
  (`isFreeTrialEnd`) and the first paid-period clip (`isChargeStart`).
- [`lib/textp2p.ts`](lib/textp2p.ts) wraps the TextP2P ringless-voicemail API.
  While `DRY_RUN=true` (the default), sends are only logged — no real
  voicemail goes out. Set `DRY_RUN=false` once your TextP2P account is
  approved and `TEXTP2P_API_KEY` / `TEXTP2P_ACCOUNT_ID` are set.
- **Important:** TextP2P's documented RVM endpoint expects a `.wav` file
  under 1 MB and under 1 minute. The current clips are `.mp3`. Confirm with
  TextP2P that `.mp3` is accepted for your account, or add a conversion step
  before launch.
- [`app/api/deliver/route.ts`](app/api/deliver/route.ts) sends the next
  story/stories to one customer or all active/trial customers, protected by
  `CRON_SECRET`.
- [`app/api/cron/daily/route.ts`](app/api/cron/daily/route.ts) is called
  automatically by Vercel Cron (see [`vercel.json`](vercel.json)) once a day
  to deliver to every active/trial customer.
- **`/admin/test`** — a passphrase-protected page (`ADMIN_SECRET`) for you and
  Bill to preview all 13 recorded clips per voice and send real test RVM
  drops to `ADMIN_PHONE_BILL` / `ADMIN_PHONE_ME` before customers ever hear
  them.

---

## Project Structure

```
app/
  page.tsx                  ← Landing page (Hero, How It Works, Pricing, FAQ)
  checkout/page.tsx         ← Plan selection + Stripe checkout redirect
  onboarding/page.tsx       ← Post-payment setup: name, phone, voice, testament, frequency
  portal/page.tsx           ← Customer self-service portal
  admin/test/page.tsx       ← Passphrase-gated voice QA + test RVM sends
  api/
    subscribe/route.ts      ← Creates Stripe checkout session
    stripe/webhook/route.ts ← Handles Stripe webhook events
    customer/route.ts       ← Customer CRUD
    portal/route.ts         ← Stripe Billing Portal redirect
    deliver/route.ts        ← Sends next stor(y/ies) to one customer or all (CRON_SECRET)
    cron/daily/route.ts     ← Vercel Cron daily delivery job
    admin/send-test/route.ts← Test RVM send to Bill/you (ADMIN_SECRET)

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
  stories.ts                ← Story/voice manifest + delivery sequencing
  textp2p.ts                ← TextP2P RVM API client (DRY_RUN aware)

prisma/
  schema.prisma             ← Customer model (voice, testament, frequency, storyIndex...)

public/audio/
  male/                     ← David voice clips (13)
  female/                   ← Sarah voice clips (13)
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

Free trial: 10 days, starting at 1 story/day. A card is required to start the
trial; the first charge happens automatically on day 11 unless cancelled.

---

## Phase 2 Roadmap

- Confirm TextP2P audio format requirements (`.wav` vs `.mp3`) and get the
  account fully approved, then flip `DRY_RUN=false`
- Record additional stories beyond the current 8-story active sequence
- 10DLC / carrier compliance review for RVM at scale
- Admin dashboard (subscriber counts, delivery logs, payment health)
- Email welcome sequence via Resend or SendGrid
- Pause/resume delivery from the customer portal
- Cleveribility / pingyDING education content as a second delivery vertical
