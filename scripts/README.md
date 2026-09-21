# Activity Management Scripts

Scripts for managing Strava activity metadata in the Redis cache.

Run them from the repo root. `backfill-activities.mjs` is plain JavaScript and
runs with `node` as is. The two older TypeScript scripts need a TypeScript
runner; plain `npx ts-node` no longer works on this repo because the package is
an ES module.

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

### 2. check-deleted-activities.ts

Identifies activities in Redis cache that are no longer in Strava (deleted activities).

**Usage:**
```bash
npx ts-node scripts/check-deleted-activities.ts
```

**Output:**
- Console display of deleted activities (ID, name, date, type)
- JSON report: `deleted-activities-TIMESTAMP.json`

### 3. remove-deleted-activities.ts

Removes specified deleted activities from Redis cache.

**Usage:**
```bash
npx ts-node scripts/remove-deleted-activities.ts <report-path>
```

**Example:**
```bash
npx ts-node scripts/remove-deleted-activities.ts scripts/deleted-activities-2025-12-18T07-36-45-548.json
```

## Prerequisites

Environment variables in `.env`:
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
   npx ts-node scripts/check-deleted-activities.ts
   ```
   Outputs: `deleted-activities-TIMESTAMP.json`

2. **Review the report** to confirm which activities to remove

3. **Remove deleted activities:**
   ```bash
   npx ts-node scripts/remove-deleted-activities.ts scripts/deleted-activities-TIMESTAMP.json
   ```
   Shows cache before/after statistics

4. **Verify cleanup:**
   ```bash
   npx ts-node scripts/check-deleted-activities.ts
   ```
   Should show 0 deleted activities

## Exit Codes

- `0` = Success
- `1` = Error (check console output)
