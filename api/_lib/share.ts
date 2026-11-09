import {randomBytes} from 'node:crypto';
import {MAX_NAME} from './http.js';
import {athleteKey} from './keys.js';
import {redis} from './redis.js';

/**
 * A planned ride shared by link (Ride weather's Share): the route, its start and the rider's
 * pace, kept 15 days under a random id. Anyone with the link reads it, with no login; the
 * forecast is fetched fresh by whoever opens it.
 */

// A route point as sent: latitude, longitude, altitude (m) and distance from the start (m).
type SharedPoint = [number, number, number, number];
type SharedRide = {
  name: string;
  points: SharedPoint[];
  start: number;
  pace: {secondsPerMetre: number; secondsPerMetreClimbed: number};
  // Stops along the way (s), when the rider set or kept them.
  stops?: number;
  // The route's page on Strava or Komoot, when it has one.
  source?: {service: 'strava' | 'komoot'; url: string};
};

const SHARE_DAYS = 15;
const MAX_POINTS = 2000;
const MAX_STOPS = 86400;
const ID = /^[A-Za-z0-9_-]{8}$/;
const SOURCES = {
  strava: /^https:\/\/www\.strava\.com\/routes\/\d+$/,
  komoot: /^https:\/\/www\.komoot\.com\/tour\/\d+$/,
};

const shareKey = (id: string): string => `ride-share:${id}`;
// The shared rides a rider keeps for quick access, by id: the moment each was added.
const bookmarksKey = (athleteId: number): string => athleteKey(athleteId, 'ride-bookmarks');
// A bookmark stays a day past its ride's start, then goes.
const BOOKMARK_GRACE = 86400000;

type RideBookmark = {id: string; name: string; start: number; distance: number; source?: SharedRide['source']};

class ShareError extends Error {}

const isNumber = (value: unknown): value is number => 'number' === typeof value && Number.isFinite(value);

/** Checks what the app sends, so a share holds only a route and nothing else. */
const sharedRideOf = (body: unknown): SharedRide => {
  const {name, points, start, pace, stops, source} = (body ?? {}) as Partial<SharedRide>;

  if ('string' !== typeof name || 0 === name.trim().length || name.length > MAX_NAME) throw new ShareError('A name');
  if (!Array.isArray(points) || points.length < 2 || points.length > MAX_POINTS)
    throw new ShareError(`2 to ${MAX_POINTS} points`);
  if (!points.every(point => Array.isArray(point) && 4 === point.length && point.every(isNumber)))
    throw new ShareError('Points of 4 numbers');
  if (!isNumber(start)) throw new ShareError('A start time');
  if (!isNumber(pace?.secondsPerMetre) || !isNumber(pace?.secondsPerMetreClimbed) || pace.secondsPerMetre <= 0)
    throw new ShareError('A pace');
  if (undefined !== stops && (!isNumber(stops) || stops < 0 || stops > MAX_STOPS))
    throw new ShareError('Stops of 0 to 24 hours');
  if (undefined !== source && !SOURCES[source?.service]?.test(String(source?.url)))
    throw new ShareError('a Strava or Komoot page as its source');

  return {
    name: name.trim(),
    points,
    start,
    pace: {secondsPerMetre: pace.secondsPerMetre, secondsPerMetreClimbed: pace.secondsPerMetreClimbed},
    ...(undefined === stops ? {} : {stops}),
    ...(undefined === source ? {} : {source: {service: source.service, url: source.url}}),
  };
};

/** Keeps the ride under a new id for 15 days, and gives the id. */
const saveSharedRide = async (body: unknown): Promise<string> => {
  const ride = sharedRideOf(body);
  const id = randomBytes(6).toString('base64url');
  await redis().set(shareKey(id), ride, {ex: SHARE_DAYS * 86400});

  return id;
};

const readSharedRide = async (id: string): Promise<SharedRide | null> =>
  ID.test(id) ? await redis().get<SharedRide>(shareKey(id)) : null;

/** Keeps a shared ride in the rider's bookmarks; false when the link leads nowhere. */
const bookmarkRide = async (athleteId: number, id: string): Promise<boolean> => {
  if (null === (await readSharedRide(id))) return false;
  await redis().hset(bookmarksKey(athleteId), {[id]: Date.now()});

  return true;
};

const unbookmarkRide = async (athleteId: number, id: string): Promise<void> => {
  await redis().hdel(bookmarksKey(athleteId), id);
};

/**
 * The rider's bookmarked rides still to come, soonest first. Those whose link expired, or
 * whose start is more than a day gone, are dropped for good.
 */
const bookmarkedRides = async (athleteId: number, now = Date.now()): Promise<RideBookmark[]> => {
  const ids = Object.keys((await redis().hgetall<Record<string, number>>(bookmarksKey(athleteId))) ?? {});
  const rides = await Promise.all(ids.map(async id => ({id, ride: await readSharedRide(id)})));
  const gone = rides.filter(({ride}) => null === ride || ride.start < now - BOOKMARK_GRACE).map(({id}) => id);
  if (0 < gone.length) await redis().hdel(bookmarksKey(athleteId), ...gone);

  return rides
    .flatMap(({id, ride}) =>
      null === ride || gone.includes(id)
        ? []
        : [{id, name: ride.name, start: ride.start, distance: ride.points.at(-1)?.[3] ?? 0, source: ride.source}],
    )
    .sort((first, second) => first.start - second.start);
};

export {bookmarkedRides, bookmarkRide, readSharedRide, saveSharedRide, ShareError, unbookmarkRide};
export type {RideBookmark, SharedRide};
