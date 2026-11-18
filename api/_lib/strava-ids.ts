/**
 * Strava ids are 64-bit integers, bigger than a JavaScript number holds exactly (2^53), so
 * Statva keeps every Strava id as a string. Strava's own `id_str` covers activities and
 * athletes only, not webhook events or uploads, so the ids are put in quotes in the JSON text
 * itself, before it is parsed.
 */

// Keys whose number value is a Strava id: any object's own id, and the ids an upload, a
// comment or a webhook event points to.
const ID_KEYS = new Set(['id', 'activity_id', 'object_id', 'owner_id']);

// A key followed by a whole number, or any other string. Matching whole strings keeps the
// search out of their text, so a description that quotes JSON is left alone.
const KEY_AND_NUMBER = /("(?:[^"\\]|\\.)*")(\s*:\s*)(-?\d+)(?![\d.eE])|"(?:[^"\\]|\\.)*"/g;

/** The JSON text with every Strava id in quotes. */
const quoteIds = (text: string): string =>
  text.replace(KEY_AND_NUMBER, (match, key: string | undefined, colon: string, digits: string | undefined) =>
    undefined !== key && undefined !== digits && ID_KEYS.has(JSON.parse(key)) ? `${key}${colon}"${digits}"` : match,
  );

/** Parses JSON from Strava (or a webhook from it) with its ids as strings. */
const parseStravaJson = <T>(text: string): T => JSON.parse(quoteIds(text)) as T;

/** The body of a Strava answer (or of a webhook call from it), with its ids as strings. */
const readStravaJson = async <T>(message: Request | Response): Promise<T> => parseStravaJson<T>(await message.text());

/** Data stored before ids were strings (activities, a merge waiting), with its ids as strings now. */
const withStringIds = <T>(value: T): T => (null === value ? value : parseStravaJson<T>(JSON.stringify(value)));

/** Whether a text is a Strava id: digits only. */
const isStravaId = (text: unknown): text is string => 'string' === typeof text && /^\d{1,20}$/.test(text);

/** Orders ids from the newest (the highest) to the oldest, without turning them into numbers. */
const newestFirst = (first: string, second: string): number =>
  second.length - first.length || (second < first ? -1 : second > first ? 1 : 0);

export {isStravaId, newestFirst, parseStravaJson, quoteIds, readStravaJson, withStringIds};
