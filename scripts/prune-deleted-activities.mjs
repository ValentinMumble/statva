/**
 * Finds activities Statva still stores that are gone from Strava, and removes them with
 * --remove. Strava's webhook normally tells Statva when an activity is deleted; this
 * catches the ones deleted while the webhook was not set up or did not get through.
 *
 * It lists every activity on Strava (one read per 200 activities) and compares that with
 * what is stored for the app's owner, whose token the app keeps from their last login.
 *
 * Usage:
 *   node scripts/prune-deleted-activities.mjs              # list them, change nothing
 *   node scripts/prune-deleted-activities.mjs --remove     # and remove them
 */
import {Redis} from '@upstash/redis';
import {loadEnv, ownerAccessToken, REDIS_KEYS, STRAVA_KEYS} from './env.mjs';

const env = loadEnv([...STRAVA_KEYS, ...REDIS_KEYS]);
const redis = new Redis({url: env.KV_REST_API_URL, token: env.KV_REST_API_TOKEN});

const PAGE_SIZE = 200;
const PAGE_PAUSE_MS = 1000;
// What the server stores per activity, as api/_lib/sync.ts names it.
const PER_ACTIVITY = ['activities', 'details', 'power'];

const athleteId = env.STRAVA_ATHLETE_IDS.split(',')[0].trim();
const isRemove = process.argv.includes('--remove');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/** Every activity id the owner has on Strava. */
const stravaIds = async () => {
  const token = await ownerAccessToken(redis);
  const ids = new Set();

  for (let page = 1; ; page++) {
    const response = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?per_page=${PAGE_SIZE}&page=${page}`,
      {
        headers: {Authorization: `Bearer ${token}`},
      },
    );

    if (!response.ok) throw new Error(`Could not list activities: ${response.status}`);

    const batch = await response.json();
    batch.forEach(({id}) => ids.add(String(id)));
    console.log(`  page ${page}: ${ids.size} activities on Strava so far`);
    if (batch.length < PAGE_SIZE) return ids;

    await sleep(PAGE_PAUSE_MS);
  }
};

const main = async () => {
  console.log(`Listing athlete ${athleteId}'s activities on Strava...`);
  const onStrava = await stravaIds();

  // The client parses replies as JSON, so numeric field names come back as numbers.
  const stored = (await redis.hkeys(`athlete:${athleteId}:activities`)).map(String);
  const gone = stored.filter(id => !onStrava.has(id));
  console.log(`\n${stored.length} stored, ${onStrava.size} on Strava, ${gone.length} gone from Strava`);

  if (0 === gone.length) return;

  for (const id of gone) {
    const activity = (await redis.hget(`athlete:${athleteId}:activities`, id)) ?? {};
    console.log(`  ${String(activity.start_date ?? '').slice(0, 10)}  ${id}  ${activity.name ?? ''}`);
  }

  if (!isRemove) return console.log('\nNothing changed. Run again with --remove to remove them.');

  for (const name of PER_ACTIVITY) await redis.hdel(`athlete:${athleteId}:${name}`, ...gone);
  console.log(`\nRemoved ${gone.length} activities.`);
};

main().catch(error => {
  console.error(error.message ?? error);
  process.exit(1);
});
