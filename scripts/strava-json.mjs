/**
 * Parses Strava's JSON with every id as a string, as the server does (api/_lib/strava-ids.ts):
 * Strava ids are 64-bit, bigger than a JavaScript number holds exactly.
 */
const ID_KEYS = new Set(['id', 'activity_id', 'object_id', 'owner_id']);
const KEY_AND_NUMBER = /("(?:[^"\\]|\\.)*")(\s*:\s*)(-?\d+)(?![\d.eE])|"(?:[^"\\]|\\.)*"/g;

export const parseStravaJson = text =>
  JSON.parse(
    text.replace(KEY_AND_NUMBER, (match, key, colon, digits) =>
      undefined !== key && undefined !== digits && ID_KEYS.has(JSON.parse(key)) ? `${key}${colon}"${digits}"` : match,
    ),
  );
