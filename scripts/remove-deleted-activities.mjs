/**
 * Removes the activities listed in a report from the Redis cache. Run
 * check-deleted-activities.mjs first, read the report, then run this.
 *
 * Usage:
 *   node scripts/remove-deleted-activities.mjs scripts/deleted-activities-<timestamp>.json
 */
import {Redis} from '@upstash/redis';
import {readFile} from 'fs/promises';
import {loadEnv, REDIS_KEYS} from './env.mjs';

const env = loadEnv(REDIS_KEYS);

const redis = new Redis({url: env.VITE_KV_REST_API_URL, token: env.VITE_KV_REST_API_TOKEN});

const [, , reportPath] = process.argv;

const main = async () => {
  if (undefined === reportPath) {
    console.error('Which report? Pass the file written by check-deleted-activities.mjs.');
    console.error('  node scripts/remove-deleted-activities.mjs scripts/deleted-activities-<timestamp>.json');
    process.exit(1);
  }

  const report = JSON.parse(await readFile(reportPath, 'utf8'));
  const activities = report.deleted_activities;

  if (!Array.isArray(activities)) throw new Error('That file has no deleted_activities list.');
  if (0 === activities.length) return console.log('The report lists nothing to remove.');

  const before = await redis.hlen('activities');
  console.log(`${before} activities cached, removing ${activities.length}\n`);

  for (const {id, name} of activities) {
    await redis.hdel('activities', String(id));
    console.log(`  removed ${id}  ${name}`);
  }

  const after = await redis.hlen('activities');
  console.log(`\nDone. ${before} to ${after} activities, ${before - after} removed.`);
};

main().catch(error => {
  console.error(error);
  process.exit(1);
});
