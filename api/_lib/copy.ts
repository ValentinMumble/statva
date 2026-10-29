import {StravaActivity} from './activities.js';
import {buildTcx, finish, pointsOf, readPart, upload, UploadError} from './merge.js';

/**
 * Copies a ride to today, at the same time of day where it was ridden: for a commute ridden
 * again the same way, with nothing recorded. Its data streams move to the new start, and it
 * goes up with the same name, description, gear and commute flag. It stays off followers'
 * feeds: it is a copy, not news.
 */

type CopyResult = {outcome: 'copied'; activity: StravaActivity} | {outcome: 'processing'};

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

/** Today (where the ride was) at the wall-clock time it started, as a moment. */
const todayAtSameTime = (startLocal: string, timeZone: string, now: number): number => {
  const [year, month, day] = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(new Date(now))
    .split('-')
    .map(Number);
  // Strava writes the local time with a Z, though it is not UTC.
  const [hour, minute, second] = startLocal.slice(11, 19).split(':').map(Number);
  const wall = Date.UTC(year, month - 1, day, hour, minute, second);
  // Twice, for a day the clocks change.
  const guess = wall - offsetAt(timeZone, wall);

  return wall - offsetAt(timeZone, guess);
};

const copyForToday = async (athleteId: number, activityId: number, now = Date.now()): Promise<CopyResult> => {
  const part = await readPart(athleteId, activityId);
  const {activity} = part;
  const timeZone = timeZoneOf(activity.timezone);
  const points = pointsOf(part);
  if (0 === points.length) throw new UploadError(`"${activity.name}" has no recorded data`, 422);

  const shift = todayAtSameTime(String(activity.start_date_local), timeZone, now) - points[0].time;
  const moved = points.map(point => ({...point, time: point.time + shift}));
  const end = moved[moved.length - 1].time;
  if (end > now) {
    const at = new Date(end).toLocaleTimeString('en-GB', {timeZone, hour: '2-digit', minute: '2-digit'});
    throw new UploadError(`Today's ride would end at ${at}: copy it after that`, 422);
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

export {copyForToday, todayAtSameTime};
export type {CopyResult};
