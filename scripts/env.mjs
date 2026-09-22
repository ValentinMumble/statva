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

export const REDIS_KEYS = ['VITE_KV_REST_API_URL', 'VITE_KV_REST_API_TOKEN'];
export const STRAVA_KEYS = ['VITE_STRAVA_CLIENT_ID', 'VITE_STRAVA_CLIENT_SECRET', 'VITE_STRAVA_REFRESH_TOKEN'];
