# Grok Bot Deployment Guide

## Quick Start Command

Tell Grok Bot:

> "Deploy the Chronological Bible Reading app from the simplexoffice/bible-reading repository (main branch) to Grok Bot infrastructure at reading-desk-5a81.apps.grok.bot with PostgreSQL database support. See APP_SPECIFICATION.md for complete details."

---

## Essential Files

### 📋 Specification & Architecture
- **`APP_SPECIFICATION.md`** - Complete app specification (THIS IS THE MAIN FILE)
  - Design tokens and color system
  - Database schema
  - API specification
  - Architecture details
  - All configuration

### 🎨 Design & Styling
- **`app/globals.css`** - Complete CSS with design tokens (all colors, spacing, components)

### ⚙️ Configuration Files
- **`cursor-app.json`** - Deployment config: `{"database": "postgres"}`
- **`package.json`** - Dependencies and build scripts
- **`next.config.mjs`** - Next.js configuration

### 🗄️ Database
- **`migrations/001_reading_record.sql`** - Database schema (3 tables: sessions, chapters, sync_key)
- **`src/lib/db.js`** - Database connection utilities
- **`src/lib/record.js`** - Progress persistence logic

### 📱 Application Code
- **`app/layout.js`** - Root layout
- **`app/page.js`** - Home page
- **`app/desk.js`** - Main UI component (365 sessions tracker)
- **`app/api/progress/route.js`** - Sync API endpoint
- **`src/lib/reading.js`** - Reading plan utilities
- **`data/plan.json`** - 365 sessions data

---

## Design Tokens Reference

### Colors (from globals.css)

```
Light Theme:
--ink: #112a46       (text)
--paper: #f4f7fb     (background)
--card: #ffffff      (cards)
--line: #c5d4e4      (borders)
--muted: #3d5570     (secondary text)
--accent: #112a46    (buttons)
--done: #1f6b45      (completed)
--soft: #acc8e5      (highlights)

Dark Theme:
--ink: #e7f0f8
--paper: #0e1c2e
--card: #16304c
--line: #2c4d70
--muted: #acc8e5
--accent: #acc8e5
--done: #8fd0a8
--soft: #24507a
```

### Typography
- **Font:** Georgia, "Iowan Old Style", "Palatino Linotype", serif
- **H1:** 1.8rem (1.45rem mobile)
- **Labels:** 0.78rem, uppercase, letter-spacing 0.04em

### Spacing & Sizing
- **Max Width:** 760px
- **Card Radius:** 16px
- **Button Radius:** 999px (pill shape)
- **Main Padding:** 24px horizontal, 64px bottom

---

## Deployment Requirements

### Infrastructure Needed
1. ✅ Node.js v18+ runtime
2. ✅ PostgreSQL database (provisioned by Grok)
3. ✅ Next.js server (not static hosting)
4. ✅ Environment variable: `DATABASE_URL`

### Build & Start
```bash
npm install
npm run build    # Builds app + runs migrations
npm start        # Starts Next.js server
```

### What Grok Bot Should Do
1. Clone repo: `simplexoffice/bible-reading` (main branch)
2. Provision PostgreSQL database
3. Set `DATABASE_URL` environment variable
4. Run build process
5. Deploy to `*.apps.grok.bot` domain
6. Ensure API routes work (requires server runtime)

---

## Critical Notes

⚠️ **This app REQUIRES:**
- Server-side execution (Next.js API routes)
- PostgreSQL database
- Cannot be deployed as static site

⚠️ **Database Auto-Setup:**
- Migrations run during build
- Seeds with initial data on first query
- No manual DB setup needed

⚠️ **Security:**
- Sync keys are hashed (SHA-256 + salt)
- No plaintext password storage
- HTTPS recommended

---

## Testing After Deployment

Visit `https://reading-desk-5a81.apps.grok.bot` and verify:

1. ✅ Page loads with reading tracker
2. ✅ Shows "71 of 365 read" progress bar
3. ✅ Theme toggle works (light/dark)
4. ✅ Session navigation (Prev/Next buttons)
5. ✅ Sync key form accepts input
6. ✅ After saving key, status shows sync confirmation
7. ✅ No "The shared record did not answer" error
8. ✅ Chapters can be marked as read
9. ✅ Progress persists on page reload

---

## API Endpoint Test

```bash
# Should return JSON with ok:true, done array, chapters array
curl https://reading-desk-5a81.apps.grok.bot/api/progress

# Expected response:
# {"ok":true,"done":[1,2,3,...],"chapters":["5:5","5:6"]}
```

---

## Repository
- **GitHub:** simplexoffice/bible-reading
- **Branch:** main
- **Origin Mirror:** Also available on Cursor Origin

---

## Support Files Location

All files are in the repository root or subdirectories as listed above.
The complete specification is in `APP_SPECIFICATION.md`.
