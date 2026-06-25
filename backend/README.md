# DeepSeek Translator API

Cloudflare Workers backend for the Chrome extension paid model:

- 30-day trial.
- Supabase magic-link sign-in through a Cloudflare Worker callback.
- Pro billing through Stripe.
- Extension calls this API.
- This API calls DeepSeek with the developer-owned API key.
- Usage is enforced server-side.

## Stack

- Cloudflare Workers
- Supabase Postgres through REST
- Supabase Auth email
- Stripe webhook
- DeepSeek API

## Local Setup

1. Create a Supabase project.
2. Run `schema.sql` in Supabase SQL Editor.
3. Copy `.dev.vars.example` to `.dev.vars`.
4. Fill secrets and public vars.
5. Install Node dependencies:

```bash
npm install
```

6. Run locally:

```bash
npm run dev
```

## Deploy

Set Cloudflare Worker secrets:

```bash
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put SUPABASE_ANON_KEY
wrangler secret put DEEPSEEK_API_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
```

Deploy:

```bash
npm run deploy
```

## Endpoints

```text
GET  /health
GET  /auth/callback
GET  /me
GET  /usage
POST /translate
POST /word-details
POST /billing/webhook
```

## Trial Limits

Defaults in `wrangler.toml`:

```text
TRIAL_DAYS=30
TRIAL_TRANSLATIONS=100
TRIAL_TOKENS=10000
PRO_MONTHLY_TOKENS=100000
PRO_DAILY_TRANSLATIONS=300
PRO_DAILY_DETAILS=20
MAX_TRANSLATION_CHARS=2000
DEEPSEEK_MODEL=deepseek-v4-flash
```

## Magic Link Flow

The extension asks Supabase Auth to send a magic link with:

```text
redirect_to=https://YOUR_WORKER_URL/auth/callback?extension_id=CHROME_EXTENSION_ID
```

The Worker callback page receives the Supabase session in the URL hash and sends it to the extension through Chrome external messaging. The extension stores the Supabase access token locally and sends:

```http
Authorization: Bearer <supabase-access-token>
```

## Billing Flow

Configure Stripe to send webhooks to:

```text
https://YOUR_WORKER_URL/billing/webhook
```

The webhook uses Stripe's `stripe-signature` header with `STRIPE_WEBHOOK_SECRET`.

Make sure Stripe Checkout collects the buyer email. The backend matches users by email and upgrades `plan` to `pro`.
