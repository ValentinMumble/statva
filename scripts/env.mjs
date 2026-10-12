/**
 * Reads the repo's env files so the scripts need no extra dependency. Run them from the
 * repo root. Anything already set in the shell wins, then .env.local, then .env.
 */
import {existsSync, readFileSync} from 'fs';

const loadFile = file => {
  if (!existsSync(file)) return;

  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);

    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
    }
  }
};

/** Loads the env files and checks the keys the script needs, exiting with a clear message. */
export const loadEnv = (required = []) => {
  loadFile('.env.local');
  loadFile('.env');

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error(`Missing environment variables: ${missing.join(', ')}`);
    console.error('Run this from the repo root, where .env.local lives.');
    process.exit(1);
  }

  return process.env;
};

export const REDIS_KEYS = ['KV_REST_API_URL', 'KV_REST_API_TOKEN'];
export const STRAVA_KEYS = ['STRAVA_CLIENT_ID', 'STRAVA_CLIENT_SECRET', 'STRAVA_ATHLETE_IDS'];

/**
 * An access token for the app's owner (the first id in STRAVA_ATHLETE_IDS), from the tokens
 * the app stored when they last logged in, refreshed and stored again when it has expired.
 * Log in to the app once before running a script.
 */
export const ownerAccessToken = async redis => {
  const [owner] = process.env.STRAVA_ATHLETE_IDS.split(',').map(id => id.trim());
  const tokens = await redis.hget('strava_tokens', owner);

  if (null === tokens) throw new Error(`No Strava tokens for athlete ${owner}. Log in to the app once first.`);
  if (tokens.expires_at - 120 > Date.now() / 1000) return tokens.access_token;

  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: tokens.refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) throw new Error(`Could not refresh the Strava token: ${response.status}`);

  const {access_token, refresh_token, expires_at} = await response.json();
  await redis.hset('strava_tokens', {[owner]: {access_token, refresh_token, expires_at}});

  return access_token;
};
