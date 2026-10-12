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

### 4. reupload-device.mjs

Uploads activities again under another recording device, since Strava cannot change the
device of an activity. It rebuilds each ride from its data into the file format Strava
recognises the new device from, so it knows only the devices listed in its `DEVICES`
table (MyWhoosh and Apple Watch Series 10 for now), plus `none` to leave the activity
without a device. `--from` takes the device name exactly as Strava shows it. The rides keep their name,
description, sport, gear and indoor flag, and are muted. Photos have to be added back by
hand from each ride's folder.

**Usage:**
```bash
node scripts/reupload-device.mjs --prepare --from "Garmin Edge 1030 Plus" --to MyWhoosh   # read only
node scripts/reupload-device.mjs --upload                                                # after you delete the originals
```

`--prepare` saves each ride in `~/Downloads/statva-reupload`. Strava refuses a copy while
the original exists and the API cannot delete activities, so you delete the originals on
Strava, then `--upload` sends every ride whose original is gone. It asks you to approve
write access in the browser, and waits whenever Strava's rate limit is reached.

## Prerequisites

Environment variables in `.env.local` or `.env` (see `.env.example`):
```
STRAVA_CLIENT_ID=...
STRAVA_CLIENT_SECRET=...
STRAVA_ATHLETE_IDS=...
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
```

The scripts act for the first athlete in `STRAVA_ATHLETE_IDS`, with the Strava token the
app stored when that athlete logged in. Log in to the app once before running them.

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
