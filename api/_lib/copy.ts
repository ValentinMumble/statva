import {StravaActivity} from './activities.js';
import {buildTcx, finish, pointsOf, readPart, upload, UploadError} from './merge.js';

/**
 * Copies a ride to another day and time (today at the same time of day by default), where it
 * was ridden: for a commute ridden again the same way, with nothing recorded. Its data streams
 * move to the new start, and it goes up with the same name, description, gear and commute
 * flag. It stays off followers' feeds: it is a copy, not news.
 */

type CopyResult = {outcome: 'copied'; activity: StravaActivity} | {outcome: 'processing'};

// When the copy starts, where the ride was: a day (2026-10-29) and a time (08:05). Either can
// be left out: today, and the time of day the ride started.
type CopyStart = {date?: string; time?: string};

// The time zone of a Strava activity, from its "(GMT+01:00) Europe/Paris".
const timeZoneOf = (timezone: unknown): string => String(timezone ?? '').replace(/^\(.*?\)\s*/, '') || 'UTC';

/** How far a time zone is ahead of UTC at a moment, in milliseconds. */
const offsetAt = (timeZone: string, moment: number): number => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(moment));
  const part = (type: string): number => Number(parts.find(found => found.type === type)?.value);
  const asUtc = Date.UTC(part('year'), part('month') - 1, part('day'), part('hour'), part('minute'), part('second'));

  return asUtc - Math.floor(moment / 1000) * 1000;
};

/**
 * The moment the copy starts: the day and time asked for, where the ride was, or today and the
 * wall-clock time the ride started.
 */
const copyStart = (startLocal: string, timeZone: string, now: number, {date, time}: CopyStart = {}): number => {
  const [year, month, day] = (
    date ??
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(now))
  )
    .split('-')
    .map(Number);
  // Strava writes the local time with a Z, though it is not UTC.
  const [hour, minute, second = 0] = (undefined === time ? startLocal.slice(11, 19) : time).split(':').map(Number);
  const wall = Date.UTC(year, month - 1, day, hour, minute, second);
  // Twice, for a day the clocks change.
  const guess = wall - offsetAt(timeZone, wall);

  return wall - offsetAt(timeZone, guess);
};

const copyActivity = async (
  athleteId: number,
  activityId: number,
  start: CopyStart = {},
  now = Date.now(),
): Promise<CopyResult> => {
  const part = await readPart(athleteId, activityId);
  const {activity} = part;
  const timeZone = timeZoneOf(activity.timezone);
  const points = pointsOf(part);
  if (0 === points.length) throw new UploadError(`"${activity.name}" has no recorded data`, 422);

  const shift = copyStart(String(activity.start_date_local), timeZone, now, start) - points[0].time;
  const moved = points.map(point => ({...point, time: point.time + shift}));
  const end = moved[moved.length - 1].time;
  if (end > now) {
    const at = new Date(end).toLocaleString('en-GB', {
      timeZone,
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
    throw new UploadError(`The copy would end on ${at}, still to come: pick an earlier time`, 422);
  }

  const uploaded = await upload(
    athleteId,
    buildTcx(String(activity.sport_type), moved),
    {
      name: String(activity.name),
      description: String(activity.description ?? ''),
      sportType: String(activity.sport_type),
      trainer: Boolean(activity.trainer),
      commute: Boolean(activity.commute),
    },
    'copy',
  );
  if (null === uploaded) return {outcome: 'processing'};
  if ('number' !== typeof uploaded) throw new UploadError(uploaded.error, 409);

  return {
    outcome: 'copied',
    activity: await finish(athleteId, uploaded, {gear_id: activity.gear_id ?? 'none', hide_from_home: true}),
  };
};

export {copyActivity, copyStart};
export type {CopyResult, CopyStart};
