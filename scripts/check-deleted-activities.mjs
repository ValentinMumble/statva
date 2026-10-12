/**
 * Finds activities in the Redis cache that no longer exist on Strava, because deleting a
 * ride there leaves its cached details behind.
 *
 * Writes a report next to this script, which remove-deleted-activities.mjs then acts on.
 *
 * Usage:
 *   node scripts/check-deleted-activities.mjs
 */
import {Redis} from '@upstash/redis';
import {writeFile} from 'fs/promises';
import {loadEnv, ownerAccessToken, REDIS_KEYS, STRAVA_KEYS} from './env.mjs';

const env = loadEnv([...STRAVA_KEYS, ...REDIS_KEYS]);

const ATHLETE_ACTIVITIES_ENDPOINT = 'https://www.strava.com/api/v3/athlete/activities';
const ITEMS_PER_PAGE = 200;
const PAGE_PAUSE_MS = 1000;

const redis = new Redis({url: env.KV_REST_API_URL, token: env.KV_REST_API_TOKEN});

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const fetchAccessToken = () => ownerAccessToken(redis);

const fetchAllActivityIds = async token => {
  const ids = new Set();

  for (let page = 1; ; page++) {
    const response = await fetch(`${ATHLETE_ACTIVITIES_ENDPOINT}?per_page=${ITEMS_PER_PAGE}&page=${page}`, {
      headers: {Authorization: `Bearer ${token}`},
    });

    if (!response.ok) throw new Error(`Could not list activities: ${response.status}`);

    const batch = await response.json();
    if (0 === batch.length) return ids;

    batch.forEach(({id}) => ids.add(String(id)));
    console.log(`  page ${page}: ${ids.size} activities so far`);

    await sleep(PAGE_PAUSE_MS);
  }
};

const main = async () => {
  const token = await fetchAccessToken();

  console.log('Listing activities on Strava...');
  const onStrava = await fetchAllActivityIds(token);

  // The client parses replies as JSON, so numeric field names come back as numbers.
  const cached = (await redis.hkeys('activities')).map(String);
  console.log(`\n${cached.length} cached, ${onStrava.size} on Strava`);

  const deletedIds = cached.filter(id => !onStrava.has(id));

  if (0 === deletedIds.length) return console.log('\nNothing to clean up: every cached activity still exists.');

  const deleted = await Promise.all(
    deletedIds.map(async id => {
      const activity = (await redis.hget('activities', id)) ?? {};

      return {id: Number(id), name: activity.name ?? 'Unknown', date: activity.start_date ?? 'Unknown'};
    }),
  );
  deleted.sort((a, b) => new Date(b.date) - new Date(a.date));

  console.log(`\n${deleted.length} cached activities are no longer on Strava:\n`);
  deleted.forEach(({id, name, date}) => console.log(`  ${String(date).slice(0, 10)}  ${id}  ${name}`));

  const report = `scripts/deleted-activities-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  await writeFile(
    report,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        summary: {
          total_cached_activities: cached.length,
          total_strava_activities: onStrava.size,
          deleted_activities_count: deleted.length,
        },
        deleted_activities: deleted,
      },
      null,
      2,
    ),
  );

  console.log(`\nReport written to ${report}`);
  console.log(`Review it, then: node scripts/remove-deleted-activities.mjs ${report}`);
};

main().catch(error => {
  console.error(error);
  process.exit(1);
});
