# Jetvision Portal

## Local setup

1. Install dependencies:

```bash
pnpm install
```

2. Create your env file:

```bash
cp .env.example .env.local
```

3. In your Supabase SQL editor, run:

- `supabase/schema.sql`

If your table already exists from an older version, also run:

- `supabase/migrations/20260222_add_sourcing_pipeline_columns.sql`

4. Fill `.env.local` with your Supabase and Avinode values:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `AVINODE_BASE_URL` (sandbox by default)
- `AVINODE_API_TOKEN`
- `AVINODE_AUTH_TOKEN`

5. Start the app:

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Internal sourcing cockpit

The Flight Requests manager view now supports a full Avinode sourcing sync loop:

- Create trip via `POST /trips`
- Receive seller responses via webhook endpoint: `POST /api/avinode/webhooks/incoming`
- Sync RFQs via `GET /rfqs/{id}` and quote pricing via `GET /quotes/{id}`
- Track RFQ count, quote count, best quote, and SLA status in each request card

Useful routes:

- `POST /api/flight-requests/:id/sync` (manual pipeline sync)
- `GET /api/avinode/rfqs/:id`
- `GET /api/avinode/quotes/:id`
- `POST /api/avinode/webhooks/incoming`

## RFQ operations workspace

Managers can now respond to RFQs directly in portal via the **RFQ Operations** view:

- `GET /api/avinode/tripmsgs/:id`
- `POST /api/avinode/tripmsgs/:id/submit-quote`
- `POST /api/avinode/tripmsgs/:id/decline`
- `POST /api/avinode/tripmsgs/:id/chat`
