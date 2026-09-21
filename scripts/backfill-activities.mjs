/**
 * Fetches the detailed record of every Strava activity into the Redis cache.
 *
 * The app only caches an activity's details when you open it, so most rides have
 * no description, calories, temperature or photos stored. This fills the gap for
 * the whole history in one go.
 *
 * Safe to stop and re-run: it reads what is already cached and only fetches the
 * rest. Strava allows 100 reads per 15 minutes and 1000 per day, so a large
 * backfill takes a while and may need a second run the next day. The script
 * paces itself, and stops before it eats the whole daily budget.
 *
 * Usage:
 *   node scripts/backfill-activities.mjs          fetch and store
 *   node scripts/backfill-activities.mjs --dry    report what it would do
 */
import {Redis} from '@upstash/redis';
import {existsSync, readFileSync} from 'fs';

// Small env reader so the script needs no extra dependency. Run it from the repo root.
const loadEnv = file => {
  if (!existsSync(file)) return;

  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
    }
  }
};

loadEnv('.env.local');
loadEnv('.env');

const TOKEN_ENDPOINT = 'https://www.strava.com/oauth/token';
const ACTIVITIES_ENDPOINT = 'https://www.strava.com/api/v3/activities';
const ATHLETE_ACTIVITIES_ENDPOINT = 'https://www.strava.com/api/v3/athlete/activities';
const ITEMS_PER_PAGE = 200;

// Leave headroom under Strava's real limits so the app keeps working meanwhile.
// The limit is shared with the app: opening it costs a handful of reads to page
// through the activity list, and at 95 there was nothing left, so the app got
// 429s and sat on a spinner. 60 leaves it room.
const READS_PER_WINDOW = 60;
const READS_PER_DAY = 960;
const WRITE_BATCH = 25;
const TOKEN_LIFETIME_MS = 5_000_000;

const isDryRun = process.argv.includes('--dry');

const required = [
  'VITE_STRAVA_CLIENT_ID',
  'VITE_STRAVA_CLIENT_SECRET',
  'VITE_STRAVA_REFRESH_TOKEN',
  'VITE_KV_REST_API_URL',
  'VITE_KV_REST_API_TOKEN',
];

const missingEnv = required.filter(key => !process.env[key]);
if (missingEnv.length > 0) {
  console.error(`Missing environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

const redis = new Redis({
  url: process.env.VITE_KV_REST_API_URL,
  token: process.env.VITE_KV_REST_API_TOKEN,
});

const log = message => console.log(`[${new Date().toLocaleTimeString()}] ${message}`);

const fetchAccessToken = async () => {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      client_id: process.env.VITE_STRAVA_CLIENT_ID,
      client_secret: process.env.VITE_STRAVA_CLIENT_SECRET,
      refresh_token: process.env.VITE_STRAVA_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) throw new Error(`Could not refresh the Strava token: ${response.status}`);

  return (await response.json()).access_token;
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/** Strava's 15 minute windows reset on the quarter hour. */
const waitForNextWindow = async () => {
  const now = new Date();
  const seconds = (15 - (now.getMinutes() % 15)) * 60 - now.getSeconds() + 5;
  log(`15 minute read budget spent, waiting ${seconds}s for the next window`);
  await sleep(seconds * 1000);
};

const fetchAllActivityIds = async token => {
  const ids = [];

  for (let page = 1; ; page++) {
    const response = await fetch(
      `${ATHLETE_ACTIVITIES_ENDPOINT}?per_page=${ITEMS_PER_PAGE}&page=${page}`,
      {headers: {Authorization: `Bearer ${token}`}},
    );

    if (429 === response.status) {
      await waitForNextWindow();
      page--;
      continue;
    }

    if (!response.ok) throw new Error(`Could not list activities: ${response.status}`);

    const batch = await response.json();
    if (0 === batch.length) return ids;

    ids.push(...batch.map(({id}) => id));
  }
};

/** Same trim as cleanActivity in src/models/activity-meta.ts: the heavy arrays are not used. */
const clean = activity => ({
  ...activity,
  segment_efforts: (activity.segment_efforts ?? []).map(({kom_rank}) => ({kom_rank})),
  splits_metric: [],
  splits_standard: [],
  laps: [],
});

const main = async () => {
  let token = await fetchAccessToken();
  let tokenFetchedAt = Date.now();

  const allIds = await fetchAllActivityIds(token);
  const storedIds = new Set(await redis.hkeys('activities'));
  const todo = allIds.filter(id => !storedIds.has(String(id)));

  log(`${allIds.length} activities on Strava, ${storedIds.size} already cached, ${todo.length} to fetch`);

  if (0 === todo.length) return log('Nothing to do, the cache is complete.');

  if (isDryRun) {
    const windows = Math.ceil(todo.length / READS_PER_WINDOW);
    log(`Dry run: would fetch ${todo.length} activities, about ${windows * 15} minutes across ${windows} windows.`);
    log(`Would need ${todo.length > READS_PER_DAY ? 'more than one day' : 'a single day'} of read budget.`);
    return;
  }

  let batch = {};
  let batchSize = 0;
  let stored = 0;
  const failed = [];

  for (const id of todo) {
    if (Date.now() - tokenFetchedAt > TOKEN_LIFETIME_MS) {
      token = await fetchAccessToken();
      tokenFetchedAt = Date.now();
      log('Refreshed the access token');
    }

    const response = await fetch(`${ACTIVITIES_ENDPOINT}/${id}`, {
      headers: {Authorization: `Bearer ${token}`},
    });

    if (429 === response.status) {
      await waitForNextWindow();
      continue;
    }

    if (!response.ok) {
      failed.push(id);
      log(`Skipped ${id}: HTTP ${response.status}`);
      continue;
    }

    batch[String(id)] = clean(await response.json());
    batchSize++;

    const [windowUsage, dayUsage] = (response.headers.get('x-readratelimit-usage') ?? '0,0')
      .split(',')
      .map(Number);

    if (batchSize >= WRITE_BATCH) {
      await redis.hset('activities', batch);
      stored += batchSize;
      batch = {};
      batchSize = 0;
      log(`Stored ${stored}/${todo.length} · reads ${windowUsage}/100 this window, ${dayUsage}/1000 today`);
    }

    if (dayUsage >= READS_PER_DAY) {
      log('Daily read budget nearly gone. Run the script again tomorrow to finish.');
      break;
    }

    if (windowUsage >= READS_PER_WINDOW) {
      if (batchSize > 0) {
        await redis.hset('activities', batch);
        stored += batchSize;
        batch = {};
        batchSize = 0;
      }
      await waitForNextWindow();
    }
  }

  if (batchSize > 0) {
    await redis.hset('activities', batch);
    stored += batchSize;
  }

  const total = await redis.hlen('activities');
  log(`Done. Stored ${stored} new records, skipped ${failed.length}, ${total} activities now cached.`);
  if (failed.length > 0) log(`Skipped ids: ${failed.join(', ')}`);
};

main().catch(error => {
  console.error(error);
  process.exit(1);
});
