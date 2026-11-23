# How to Publish the Reading Desk App

## Current Status

✅ **Code is ready** - The Next.js 15 + PostgreSQL app builds successfully  
✅ **Database seed is correct** - Configured to seed with 71 sessions and 2 chapter marks  
✅ **API works locally** - Verified with PGlite (local PostgreSQL)  
❌ **Not published** - Cannot be published from Grok Bot sessions (see limitation below)

## The Limitation

**Grok Bot agents cannot publish Cursor Apps.** This is a known limitation documented at:
https://forum.cursor.com/t/grok-bot-doesnt-work-with-cursor-apps/177762

Only cloud agents started directly in Cursor have access to the Preview/Publish controls.

## How to Publish (Step-by-Step)

### Step 1: Merge the Documentation PR

Merge PR #23 which adds this documentation:
https://github.com/simplexoffice/bible-reading/pull/23

### Step 2: Start a Cursor Cloud Agent

1. Open **Cursor Desktop** (not Grok Bot)
2. Open this repository or navigate to the project
3. Start a new **Cloud Agent** chat
4. Tell it: "Deploy the main branch to reading-desk-5a81"

### Step 3: Use the Publish Controls

The agent will:
1. Prepare the app for deployment
2. Show you a **Preview/Publish tray** with controls
3. Run security checks when you click **Publish**
4. Return a live link at `https://reading-desk-5a81.apps.grok.bot`

### Step 4: Set the Sync Key Secret

After the app is published:

1. Go to https://cursor.com/apps
2. Find the `reading-desk-5a81` app in your dashboard
3. Click on the app to open its settings
4. Navigate to **Settings → Secrets**
5. Click **Add secret**
6. Enter:
   - **Name:** `BIBLE_SYNC_TOKEN`
   - **Value:** [Your existing sync key - the one you've been using]
7. Click **Save**

The app will automatically redeploy with the secret available.

**IMPORTANT:** Do NOT invent a new sync key. Use your existing one that has your progress history.

## What Happens on First Use

When someone first calls the API after deployment:

1. Database is empty initially
2. First API call triggers the seed function
3. Seed creates:
   - All 365 session records (1-71 marked as done)
   - 2 chapter markers: "5:5" and "5:6"
   - Empty sync_key table (waiting to be claimed)
4. First authenticated request with sync key claims it
5. Sync key is stored as a salted SHA-256 hash
6. All future requests must use that same sync key

## Verification

After publishing and setting the secret, verify:

```bash
# Should return: {"ok":true,"done":[1..71],"chapters":["5:5","5:6"]}
curl https://reading-desk-5a81.apps.grok.bot/api/progress \
  -H "x-sync-key: YOUR_SYNC_KEY"
```

The home page should show: **"71 of 365 sessions read"**

## Technical Details

### Environment Variables (Auto-Provided by Cursor Apps)

- `DATABASE_URL` - PostgreSQL connection string (pooled)
- `DATABASE_URL_UNPOOLED` - Direct PostgreSQL connection
- `NODE_ENV` - Set to "production"
- `PORT` - HTTP port for the Next.js server

### Environment Variables (Must Be Manually Added)

- `BIBLE_SYNC_TOKEN` - Your existing sync key (add via Apps dashboard)

### Build Process

When deployed, Cursor Apps runs:

```bash
npm install
npm run build  # Runs: next build && node scripts/migrate.mjs
npm start      # Runs: next start
```

The `migrate.mjs` script runs all `.sql` files from the `migrations/` folder.

### Database Schema

```sql
-- Sessions (365 records, tracking which are done)
CREATE TABLE sessions (
  n INTEGER PRIMARY KEY,
  done BOOLEAN NOT NULL DEFAULT FALSE
);

-- Chapter markers (book:chapter format)
CREATE TABLE chapters (
  key TEXT PRIMARY KEY
);

-- Sync key (single row, stores salted hash)
CREATE TABLE sync_key (
  id INTEGER PRIMARY KEY,
  salt TEXT NOT NULL,
  key_hash TEXT NOT NULL
);
```

## Troubleshooting

### "The shared record did not answer"

This means the API endpoint returns 404. The app needs to be published (Step 2).

### "unauthorized" error

The sync key doesn't match. Either:
- `BIBLE_SYNC_TOKEN` environment variable is not set
- The key you're using doesn't match what was claimed
- The sync key was claimed by someone else first

### API returns 404

The app is not published or the deployment failed. Check the Cursor Apps dashboard for deployment logs.

### Build fails

Check that:
- `package.json` has all required dependencies
- `migrations/*.sql` files are valid SQL
- `next.config.mjs` is correct

## Alternative Deployment Methods

If Cursor Apps publishing doesn't work, the app can also be deployed to:

- **Vercel** - Connect your Origin/GitHub repo (requires Pro/Enterprise)
- **Railway** - Deploy with Postgres addon
- **Render** - Deploy with Managed Postgres
- **Fly.io** - Deploy with Postgres cluster

All of these require setting the `DATABASE_URL` environment variable and the `BIBLE_SYNC_TOKEN` secret.

## Support

If you encounter issues:

1. Check the Cursor Apps dashboard for deployment logs
2. Review the [Cursor Apps documentation](https://cursor.com/docs/cloud-agent/apps)
3. Contact Cursor support through the dashboard
