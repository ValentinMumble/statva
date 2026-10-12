/**
 * Copies the v1 data (one rider, shared keys) into the owner's v2 keys
 * (`athlete:<id>:<name>`). It only copies: v1 keeps reading its own keys, so both
 * versions can run side by side until v2 replaces v1.
 *
 * The v1 activity cache holds full details, so the v2 summaries are made from them, and
 * the history is marked as synced: the first v2 visit then only asks Strava for what is new.
 *
 * Usage:
 *   node scripts/migrate-to-v2.mjs --dry    # say what it would copy
 *   node scripts/migrate-to-v2.mjs
 */
import {Redis} from '@upstash/redis';
import {loadEnv, REDIS_KEYS} from './env.mjs';

const env = loadEnv([...REDIS_KEYS, 'STRAVA_ATHLETE_IDS']);
const redis = new Redis({url: env.KV_REST_API_URL, token: env.KV_REST_API_TOKEN});
const isDryRun = process.argv.includes('--dry');
const owner = Number(env.STRAVA_ATHLETE_IDS.split(',')[0].trim());
const BATCH = 50;

// v1 hash -> v2 name. v1 called the detailed activities "activities".
const COPIED = {activities: 'details', events: 'events', labels: 'labels', ftp_tests: 'ftp_tests', check_ins: 'check_ins', expenses: 'expenses'};

// Same cut as api/_lib/activities.ts: a summary is the activity without its long lists.
const DROPPED_FROM_SUMMARY = ['splits_metric', 'splits_standard', 'laps', 'similar_activities', 'stats_visibility', 'segment_efforts', 'best_efforts', 'description', 'private_note', 'photos'];

const summaryOf = activity => {
  const summary = Object.fromEntries(Object.entries(activity).filter(([field]) => !DROPPED_FROM_SUMMARY.includes(field)));

  return undefined === activity.map ? summary : {...summary, map: {id: activity.map.id, summary_polyline: activity.map.summary_polyline}};
};

// What v1 had written into its code, as v2 settings for the owner.
const OWNER_SETTINGS = {
  defaultBike: 'b13440652',
  costBike: 'b13440652',
  retiredBikes: ['b11897955', 'b12655849'],
  retiredChains: ['🍍', '🧄', '🍪', '🍌', '🍋'],
  partLimitsKm: {chain: 400, tire: 8000, cassette: 30000},
  yearGoalKm: 10000,
  sports: ['Ride', 'Run', 'Swim', 'Tennis'],
  heartRate: {max: 188, resting: 52, threshold: 172, zones: [117, 143, 162, 181]},
  weightKg: 74,
  mapCenter: [47.23, -1.55],
  locale: 'fr-FR',
  normalizedPowerFromNote: true,
  unprocessedEmoji: true,
  club: {
    name: 'N-Peloton',
    markers: {Pirate: ['🏴‍☠️', 'pirate'], PCC: ['🍊']},
    groupWords: ['Raymond Ride', 'N-Peloton', 'NP', 'duo'],
    groupTags: ['groupe', 'duo'],
  },
};

const writeInBatches = async (key, entries) => {
  for (let index = 0; index < entries.length; index += BATCH) {
    await redis.hset(key, Object.fromEntries(entries.slice(index, index + BATCH)));
  }
};

const main = async () => {
  if (!Number.isInteger(owner) || 0 >= owner) throw new Error('STRAVA_ATHLETE_IDS must start with the owner id');

  console.log(`${isDryRun ? 'Would copy' : 'Copying'} v1 data to athlete:${owner}:*\n`);

  for (const [from, to] of Object.entries(COPIED)) {
    const entries = Object.entries((await redis.hgetall(from)) ?? {});
    const already = await redis.hlen(`athlete:${owner}:${to}`);
    console.log(`  ${from.padEnd(10)} -> ${to.padEnd(10)} ${entries.length} entries (${already} already there)`);

    if (!isDryRun) await writeInBatches(`athlete:${owner}:${to}`, entries);

    if ('details' === to) {
      console.log(`  ${''.padEnd(10)} -> activities ${entries.length} summaries made from the details`);

      if (!isDryRun) {
        await writeInBatches(`athlete:${owner}:activities`, entries.map(([id, activity]) => [id, summaryOf(activity)]));
        const newestStart = Math.max(0, ...entries.map(([, {start_date}]) => Math.floor(new Date(start_date).getTime() / 1000)));
        await redis.hset(`athlete:${owner}:sync`, {nextPage: 1, historyDone: true, newestStart});
      }
    }
  }

  console.log(`  settings   -> settings   ${Object.keys(OWNER_SETTINGS).length} values from the v1 code`);
  if (!isDryRun) await redis.hset(`athlete:${owner}:settings`, OWNER_SETTINGS);

  console.log(isDryRun ? '\nNothing written (dry run).' : '\nDone. v1 data is untouched.');
};

main().catch(error => {
  console.error(error);
  process.exit(1);
});
