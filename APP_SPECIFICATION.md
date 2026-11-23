# Chronological Bible Reading App - Complete Specification

## Overview
A Next.js web application for tracking chronological Bible reading progress across 365 sessions with PostgreSQL backend for shared progress sync.

**Live URL:** `reading-desk-5a81.apps.grok.bot` (or custom subdomain on Grok infrastructure)

---

## Architecture

### Technology Stack
- **Framework:** Next.js 15.5.6 (App Router)
- **Runtime:** React 19.2.0
- **Database:** PostgreSQL (via `pg` package or `@electric-sql/pglite` for local dev)
- **Styling:** Custom CSS with CSS variables (no framework)
- **Font:** Georgia, "Iowan Old Style", "Palatino Linotype", serif

### File Structure
```
├── app/
│   ├── layout.js          # Root layout with metadata
│   ├── page.js            # Home page (renders Desk)
│   ├── desk.js            # Main reading tracker component (client)
│   ├── globals.css        # Global styles and design tokens
│   └── api/
│       └── progress/
│           └── route.js   # API endpoint for sync
├── src/
│   └── lib/
│       ├── db.js          # Database connection utilities
│       ├── reading.js     # Reading plan utilities
│       └── record.js      # Progress persistence logic
├── data/
│   └── plan.json          # 365 sessions reading plan data
├── migrations/
│   └── 001_reading_record.sql  # Database schema
├── scripts/
│   └── migrate.mjs        # Migration runner
├── cursor-app.json        # Deployment config: {"database": "postgres"}
├── package.json
└── next.config.mjs
```

---

## Design System

### Color Tokens (CSS Variables)

#### Light Theme
```css
:root {
  color-scheme: light;
  --ink: #112a46;           /* Primary text */
  --paper: #f4f7fb;         /* Background */
  --card: #ffffff;          /* Card backgrounds */
  --line: #c5d4e4;          /* Borders */
  --muted: #3d5570;         /* Secondary text */
  --accent: #112a46;        /* Accent color */
  --accent-ink: #ffffff;    /* Accent text */
  --done: #1f6b45;          /* Completed items */
  --soft: #acc8e5;          /* Soft highlights */
}
```

#### Dark Theme
```css
:root[data-theme="dark"] {
  color-scheme: dark;
  --ink: #e7f0f8;
  --paper: #0e1c2e;
  --card: #16304c;
  --line: #2c4d70;
  --muted: #acc8e5;
  --accent: #acc8e5;
  --accent-ink: #112a46;
  --done: #8fd0a8;
  --soft: #24507a;
}
```

### Typography
- **Font Family:** Georgia, "Iowan Old Style", "Palatino Linotype", serif
- **H1:** 1.8rem (1.45rem on mobile), line-height 1.15
- **Kicker/Label:** 0.78rem, uppercase, letter-spacing 0.04em

### Component Styles

#### Layout
- **Max Width:** 760px centered
- **Padding:** 24px horizontal, 64px bottom
- **Card Border Radius:** 16px
- **Button Border Radius:** 999px (fully rounded)

#### Components
- **Card:** White/dark card bg, 1px border, 16px radius, 18px padding
- **Button:** Border, transparent bg, rounded pill, 8px/14px padding
- **Primary Button:** Accent bg with accent-ink text
- **Progress Bar:** 8px height, soft bg, done fill, 99px radius
- **Input:** Line border, paper bg, 10px radius, 8px/10px padding

#### States
- **Done Items:** `--done` color (green)
- **Current Session:** Bold font weight
- **Read Chapters:** `--soft` background

---

## Database Schema

### Tables

#### sessions
```sql
CREATE TABLE IF NOT EXISTS sessions (
  n INTEGER PRIMARY KEY,
  done BOOLEAN NOT NULL DEFAULT false
);
```

#### chapters
```sql
CREATE TABLE IF NOT EXISTS chapters (
  key TEXT PRIMARY KEY
);
```
Key format: `{book_number}:{chapter_number}` (e.g., "5:5")

#### sync_key
```sql
CREATE TABLE IF NOT EXISTS sync_key (
  id INTEGER PRIMARY KEY,
  salt TEXT NOT NULL,
  key_hash TEXT NOT NULL
);
```
Single-row table (id=1) storing hashed sync key with salt.

### Initial Seed Data
- Sessions 1-71: `done = true`
- Chapters: `["5:5", "5:6"]`

---

## API Specification

### Endpoint: `/api/progress`

#### GET
**Request Headers:**
- `x-sync-key`: User's sync key (optional)

**Response:**
```json
{
  "ok": true,
  "done": [1, 2, 3, ...],      // Array of completed session numbers
  "chapters": ["5:5", "5:6"]    // Array of chapter keys
}
```

**Error Response:**
```json
{
  "ok": false,
  "error": "unauthorized" | "unconfigured" | "unreachable"
}
```

#### POST
**Request Headers:**
- `x-sync-key`: User's sync key (optional)
- `content-type`: text/plain

**Request Body:**
```json
{
  "token": "user-sync-key",     // Required: sync key
  "n": 72,                      // Optional: session number (1-365)
  "done": true,                 // Optional: session completion status
  "chapter": "5:7",             // Optional: chapter key
  "read": true,                 // Optional: chapter read status
  "keep": ["5:5", "5:6"]        // Optional: chapters to mark as read
}
```

**Response:**
```json
{
  "ok": true,
  "claimed": true,              // If this was first time setting key
  "done": [1, 2, 3, ...],
  "chapters": ["5:5", "5:6"]
}
```

**Security:**
- Sync keys are hashed with SHA-256 and salt
- Timing-safe comparison to prevent timing attacks
- Max key length: 128 characters
- Max request body: 4096 bytes
- Max chapters in `keep`: 16

---

## Client-Side Features

### Local Storage
- `cbr-sync-key`: User's sync key
- `cbr-last`: Last viewed session number
- `cbr-theme`: "light" or "dark"

### State Management
- 365 sessions with done/undone status
- Chapter read tracking by book:chapter keys
- Current view session (1-365)
- Sync key management
- Theme toggle

### UI Components

#### Progress Bar
Shows `{done} of 365 read` with visual progress bar.

#### Session Navigation
- Previous/Next buttons
- Resume to next unread session
- Direct session selection

#### Chapter Tracking
For each session, displays chapter chips with:
- Chapter label (e.g., "Genesis 1")
- Read checkbox
- Link to online Bible (wol.jw.org)

#### Sync Key Form
- Password input (max 128 chars)
- Save button
- Status messages

#### Theme Toggle
Toggle between light/dark themes, respects system preference.

---

## Reading Plan Data Structure

Located in `data/plan.json`:

```json
{
  "eras": [
    {
      "name": "Era Name",
      "count": 50
    }
  ],
  "sessions": [
    {
      "n": 1,
      "era": 0,
      "note": "Optional reading note",
      "refs": [
        {
          "label": "Genesis 1–2",
          "book": 1,
          "chapter": 1,
          "href": "https://wol.jw.org/..."
        }
      ]
    }
  ]
}
```

**Book Numbers:** 1-66 (Genesis to Revelation)

---

## Configuration Files

### package.json
```json
{
  "name": "bible-reading",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build && node scripts/migrate.mjs",
    "start": "next start"
  },
  "dependencies": {
    "@electric-sql/pglite": "^0.3.14",
    "next": "^15.5.6",
    "pg": "^8.16.3",
    "react": "^19.2.0",
    "react-dom": "^19.2.0"
  }
}
```

### next.config.mjs
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
```

### cursor-app.json
```json
{
  "database": "postgres"
}
```

---

## Environment Variables

### Required for Production
- `DATABASE_URL`: PostgreSQL connection string
  - Example: `postgresql://user:password@host:5432/database`
  - If not set, falls back to PGlite (in-memory database)

---

## Deployment Requirements

### Infrastructure
1. **Node.js Runtime:** v18+ required
2. **PostgreSQL Database:** Any version compatible with `pg` package
3. **Build Process:** 
   - Run `npm install`
   - Run `npm run build` (builds Next.js and runs migrations)
   - Run `npm start` to serve

### Database Initialization
Migrations run automatically during build via `scripts/migrate.mjs`.
Database auto-seeds with initial data on first query.

### Security Considerations
- Sync keys are never stored in plaintext
- Use HTTPS for all requests
- Database connection must be encrypted
- No CORS restrictions (can be accessed from any origin)
- API validates all input lengths and types

---

## User Flow

1. **First Visit:**
   - Sees progress bar (71 of 365 read by default)
   - Current session is #72
   - Status: "Saved progress is on this device until you save a sync key"

2. **Setting Sync Key:**
   - Enter sync key (1-128 characters)
   - Click Save
   - If key doesn't exist: creates it and claims it
   - If key exists: authenticates and syncs progress

3. **Reading Sessions:**
   - Navigate sessions with Prev/Next/Resume
   - View session details, era, and reading notes
   - Mark chapters as read with checkboxes
   - Click chapter names to open online Bible

4. **Theme Toggle:**
   - Switch between light/dark modes
   - Preference saved to localStorage
   - Defaults to system preference

5. **Sync Behavior:**
   - GET on load: fetch shared progress
   - POST on key save/change: sync progress
   - POST on session toggle: update session status
   - POST on chapter toggle: update chapter status
   - Offline fallback: "The shared record did not answer"

---

## External Links
All chapter links point to: `https://wol.jw.org/en/wol/b/r1/lp-e/nwt/{book}/{chapter}`

---

## Responsive Design
- **Desktop:** 760px max width, full navigation
- **Mobile (<640px):**
  - Smaller headings (1.45rem)
  - Stacked top navigation
  - Touch-friendly button sizes (44px+ tap targets)

---

## Error Handling

### Client-Side
- API failures: Display error in status
- Storage errors: Silent fallback (no localStorage)
- Fetch timeouts: "unreachable" error

### Server-Side
- Invalid requests: 400 Bad Request
- Unauthorized: `{"ok": false, "error": "unauthorized"}`
- Unconfigured: `{"ok": false, "error": "unconfigured"}`
- Database errors: `{"ok": false, "error": "{error message}"}`

---

## Testing Checklist

- [ ] Session navigation (Prev/Next/Resume)
- [ ] Chapter read toggles
- [ ] Sync key save/authentication
- [ ] Progress persistence across page reloads
- [ ] Theme toggle and system preference
- [ ] Mobile responsive layout
- [ ] API authentication with sync key
- [ ] Database migrations run successfully
- [ ] Multiple users with different sync keys
- [ ] Offline fallback behavior

---

## Repository Information

**Repository:** simplexoffice/bible-reading  
**Branch:** main  
**Deployment Domain:** `*.apps.grok.bot` (Grok Bot infrastructure)

---

## Notes for Grok Bot Deployment

1. This app requires PostgreSQL database provisioning
2. Set `DATABASE_URL` environment variable with connection string
3. Build process automatically runs database migrations
4. App must run as a Next.js server (not static export)
5. API routes require server-side execution
6. No additional secrets or API keys needed
7. App is fully self-contained with no external service dependencies (except database)
