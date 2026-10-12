/** Reads a server-only setting. These never go in the browser bundle (no VITE_ prefix). */
const env = (name: string): string => {
  const value = process.env[name];

  if (undefined === value || '' === value) throw new Error(`Missing environment variable ${name}`);

  return value;
};

/** The Strava athletes allowed to log in, from a comma-separated list. The first one owns shared routes. */
const allowedAthletes = (): number[] =>
  env('STRAVA_ATHLETE_IDS')
    .split(',')
    .map(id => Number(id.trim()))
    .filter(id => Number.isInteger(id) && 0 < id);

export {allowedAthletes, env};
