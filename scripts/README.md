# Activity Management Scripts

Two TypeScript scripts for managing Strava activity metadata in Redis cache.

## Scripts

### 1. check-deleted-activities.ts

Identifies activities in Redis cache that are no longer in Strava (deleted activities).

**Usage:**
```bash
npx ts-node scripts/check-deleted-activities.ts
```

**Output:**
- Console display of deleted activities (ID, name, date, type)
- JSON report: `deleted-activities-TIMESTAMP.json`

### 2. remove-deleted-activities.ts

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
