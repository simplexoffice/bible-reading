# Deployment Guide

## Overview

This app is deployed to **Cursor Apps** hosting at `https://reading-desk-5a81.apps.grok.bot`.

Cursor Apps provides:
- Automatic Next.js hosting
- Managed PostgreSQL database (via `DATABASE_URL` environment variable)
- Automatic deployments on push to `main` branch
- Built-in secrets management

## Database

The app uses PostgreSQL for storing:
- Session progress (365 sessions, tracking which are done)
- Chapter markers (book:chapter format like "5:5")
- Sync keys (stored as salted SHA-256 hashes)

### Database Setup

Migrations run automatically during the build process via `npm run build` (which runs `scripts/migrate.mjs`).

Initial seed data is created on first API call:
- 71 sessions marked as done (sessions 1-71)
- 2 chapter markers: "5:5" and "5:6"
- Sync key is created when first user authenticates

The seed is **idempotent** - it only runs if the sessions table is empty, so it never overwrites existing data.

## Sync Key

The app requires a sync key for authentication. The key must be provided via an environment variable:

**Environment Variable Name:** `BIBLE_SYNC_TOKEN`

This variable should be set in the **Cursor Apps dashboard** under the app's Secrets section.

### How the Sync Key Works

1. The first user to call the API with their sync key "claims" it
2. The sync key is stored as a salted SHA-256 hash (never plaintext)
3. Subsequent API calls must provide the same sync key
4. The sync key is sent via:
   - `x-sync-key` HTTP header, OR
   - `token` field in POST request body

### Setting the Sync Key

1. Open the [Cursor Apps Dashboard](https://cursor.com/apps)
2. Find the `reading-desk-5a81` app
3. Go to Settings → Secrets
4. Add a new secret:
   - **Name:** `BIBLE_SYNC_TOKEN`
   - **Value:** [The owner's existing sync key]
5. Save the secret

The app will automatically redeploy with the new secret available.

## Publishing

**Note:** Cursor Apps publishing is only available from cloud agents started directly in Cursor, not from Grok Bot sessions.

To publish updates:

1. Start a cloud agent in Cursor (not Grok Bot)
2. Ask the agent to "deploy this app" or "publish to reading-desk-5a81"
3. The agent will show Preview/Publish controls
4. Click **Publish** to deploy to production

## API Endpoints

- `GET /api/progress` - Get current progress (requires sync key)
- `POST /api/progress` - Update progress (requires sync key)

## Build Process

```bash
npm install
npm run build  # Runs: next build && node scripts/migrate.mjs
npm start      # Runs: next start
```

## Environment Variables

Required in production:

- `DATABASE_URL` - PostgreSQL connection string (auto-provided by Cursor Apps)
- `DATABASE_URL_UNPOOLED` - Direct PostgreSQL connection (auto-provided by Cursor Apps)
- `BIBLE_SYNC_TOKEN` - The owner's sync key (must be manually added to secrets)

## Troubleshooting

### API returns 404

- Check that the app has been published (not just built)
- Verify the build completed successfully
- Check the app logs in Cursor Apps dashboard

### "unauthorized" error

- Ensure `BIBLE_SYNC_TOKEN` is set in Cursor Apps secrets
- Verify the sync key matches what was originally claimed

### "The shared record did not answer"

- Database may not be initialized yet
- Check API endpoint is accessible: `curl https://reading-desk-5a81.apps.grok.bot/api/progress`
- Verify migrations have run successfully
