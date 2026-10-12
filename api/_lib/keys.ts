/** Every rider's data lives under their own prefix, so one rider can never reach another's. */
const athleteKey = (athleteId: number, name: string): string => `athlete:${athleteId}:${name}`;

// Shared by every rider: Strava tokens (never reachable from the browser) and the
// app-wide rate limit usage.
const TOKENS_KEY = 'strava_tokens';
const USAGE_KEY = 'strava:usage';

export {athleteKey, TOKENS_KEY, USAGE_KEY};
