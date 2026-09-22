# Activity Management Scripts

Scripts for managing Strava activity metadata in the Redis cache.

Run them from the repo root, where `.env.local` lives. They are plain JavaScript
and run with `node` as is, with no build step and no dependency beyond
`@upstash/redis`. They share `env.mjs`, which reads `.env.local` then `.env` and
stops with a clear message if a key is missing.

## Scripts

### 1. backfill-activities.mjs

Fetches the detailed record of every Strava activity into the cache. The app only
caches an activity's details when you open it, so most rides have no description,
calories, temperature or photos stored until this has run.

Safe to stop and re-run: it reads what is already cached and fetches only the
rest. Strava allows 100 reads per 15 minutes and 1000 per day, so a full backfill
takes a couple of hours and a big one may need a second run the next day. The
script paces itself and stops before it uses the whole daily budget, so the app
keeps working while it runs.

**Usage:**
```bash
node scripts/backfill-activities.mjs --dry    # report what it would fetch
node scripts/backfill-activities.mjs          # fetch and store
```

Leave it running in a terminal. It prints progress and the read budget as it
goes, and says whether it needs another run tomorrow.

### 2. check-deleted-activities.mjs

Identifies activities in Redis cache that are no longer in Strava (deleted activities).

**Usage:**
```bash
node scripts/check-deleted-activities.mjs
```

**Output:**
- The deleted activities listed in the console
- A report at `scripts/deleted-activities-TIMESTAMP.json` for the next script

### 3. remove-deleted-activities.mjs

Removes specified deleted activities from Redis cache.

**Usage:**
```bash
node scripts/remove-deleted-activities.mjs <report-path>
```

**Example:**
```bash
node scripts/remove-deleted-activities.mjs scripts/deleted-activities-2025-12-18T07-36-45-548.json
```

## Prerequisites

Environment variables in `.env.local` or `.env`:
```
VITE_STRAVA_CLIENT_ID=...
VITE_STRAVA_CLIENT_SECRET=...
VITE_STRAVA_REFRESH_TOKEN=...
VITE_KV_REST_API_URL=...
VITE_KV_REST_API_TOKEN=...
```

## Workflow

### Filling the cache

```bash
node scripts/backfill-activities.mjs
```

### Clearing out deleted activities

1. **Check for deleted activities:**
   ```bash
   node scripts/check-deleted-activities.mjs
   ```
   Outputs: `scripts/deleted-activities-TIMESTAMP.json`

2. **Review the report** to confirm which activities to remove

3. **Remove deleted activities:**
   ```bash
   node scripts/remove-deleted-activities.mjs scripts/deleted-activities-TIMESTAMP.json
   ```
   Shows the cache count before and after

4. **Verify cleanup:**
   ```bash
   node scripts/check-deleted-activities.mjs
   ```
   Should find nothing left to clean up

## Exit Codes

- `0` = Success
- `1` = Error (check console output)
