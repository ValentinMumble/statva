import {redis} from './redis.js';
import {USAGE_KEY} from './keys.js';

// Strava's read limit is shared by every rider of the app. Backfilling details is the
// only thing that can wait, so it stops at half of either window, which leaves the rest
// for visits, webhooks and v1 while it still runs.
const BACKFILL_SHARE = 0.5;

type Usage = {short: number; shortLimit: number; daily: number; dailyLimit: number; at: number};

const QUARTER_HOUR_MS = 15 * 60 * 1000;

/** Records the read usage Strava reports on every response. */
const recordUsage = async (headers: Headers): Promise<void> => {
  const [short, daily] = (headers.get('x-readratelimit-usage') ?? '').split(',').map(Number);
  const [shortLimit, dailyLimit] = (headers.get('x-readratelimit-limit') ?? '').split(',').map(Number);

  if ([short, daily, shortLimit, dailyLimit].some(value => !Number.isFinite(value))) return;

  await redis().set(USAGE_KEY, {short, shortLimit, daily, dailyLimit, at: Date.now()});
};

/** Whether there is room to backfill now. Strava's 15-minute window resets on the quarter hour, the daily one at midnight UTC. */
const canBackfill = (usage: Usage | null, now = Date.now()): boolean => {
  if (null === usage) return true;

  const sameQuarter = Math.floor(usage.at / QUARTER_HOUR_MS) === Math.floor(now / QUARTER_HOUR_MS);
  const sameDay = new Date(usage.at).toISOString().slice(0, 10) === new Date(now).toISOString().slice(0, 10);
  const short = sameQuarter ? usage.short : 0;
  const daily = sameDay ? usage.daily : 0;

  return short < usage.shortLimit * BACKFILL_SHARE && daily < usage.dailyLimit * BACKFILL_SHARE;
};

const readUsage = async (): Promise<Usage | null> => await redis().get<Usage>(USAGE_KEY);

export {canBackfill, readUsage, recordUsage};
export type {Usage};
