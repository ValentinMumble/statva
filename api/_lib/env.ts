import {createHmac} from 'node:crypto';

/** Reads a server-only setting. These never go in the browser bundle (no VITE_ prefix). */
const env = (name: string): string => {
  const value = process.env[name];

  if (undefined === value || '' === value) throw new Error(`Missing environment variable ${name}`);

  return value;
};

/** The Strava athletes allowed to log in, from a comma-separated list. */
const allowedAthletes = (): number[] =>
  env('STRAVA_ATHLETE_IDS')
    .split(',')
    .map(id => Number(id.trim()))
    .filter(id => Number.isInteger(id) && 0 < id);

/**
 * The string Strava echoes back once, when the webhook is registered. It only has to be
 * one we can recompute, so it comes from the client secret rather than its own setting.
 * scripts/webhook-subscribe.mjs computes the same value.
 */
const webhookVerifyToken = (): string =>
  createHmac('sha256', env('STRAVA_CLIENT_SECRET')).update('statva-webhook').digest('hex').slice(0, 32);

export {allowedAthletes, env, webhookVerifyToken};
