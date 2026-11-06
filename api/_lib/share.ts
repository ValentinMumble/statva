import {randomBytes} from 'node:crypto';
import {MAX_NAME} from './http.js';
import {redis} from './redis.js';

/**
 * A planned ride shared by link (Ride weather's Share): the route, its start and the rider's
 * pace, kept 30 days under a random id. Anyone with the link reads it, with no login; the
 * forecast is fetched fresh by whoever opens it.
 */

// A route point as sent: latitude, longitude, altitude (m) and distance from the start (m).
type SharedPoint = [number, number, number, number];
type SharedRide = {
  name: string;
  points: SharedPoint[];
  start: number;
  pace: {secondsPerMetre: number; secondsPerMetreClimbed: number};
};

const SHARE_DAYS = 30;
const MAX_POINTS = 2000;
const ID = /^[A-Za-z0-9_-]{8}$/;

const shareKey = (id: string): string => `ride-share:${id}`;

class ShareError extends Error {}

const isNumber = (value: unknown): value is number => 'number' === typeof value && Number.isFinite(value);

/** Checks what the app sends, so a share holds only a route and nothing else. */
const sharedRideOf = (body: unknown): SharedRide => {
  const {name, points, start, pace} = (body ?? {}) as Partial<SharedRide>;

  if ('string' !== typeof name || 0 === name.trim().length || name.length > MAX_NAME) throw new ShareError('A name');
  if (!Array.isArray(points) || points.length < 2 || points.length > MAX_POINTS)
    throw new ShareError(`2 to ${MAX_POINTS} points`);
  if (!points.every(point => Array.isArray(point) && 4 === point.length && point.every(isNumber)))
    throw new ShareError('Points of 4 numbers');
  if (!isNumber(start)) throw new ShareError('A start time');
  if (!isNumber(pace?.secondsPerMetre) || !isNumber(pace?.secondsPerMetreClimbed) || pace.secondsPerMetre <= 0)
    throw new ShareError('A pace');

  return {
    name: name.trim(),
    points,
    start,
    pace: {secondsPerMetre: pace.secondsPerMetre, secondsPerMetreClimbed: pace.secondsPerMetreClimbed},
  };
};

/** Keeps the ride under a new id for 30 days, and gives the id. */
const saveSharedRide = async (body: unknown): Promise<string> => {
  const ride = sharedRideOf(body);
  const id = randomBytes(6).toString('base64url');
  await redis().set(shareKey(id), ride, {ex: SHARE_DAYS * 86400});

  return id;
};

const readSharedRide = async (id: string): Promise<SharedRide | null> =>
  ID.test(id) ? await redis().get<SharedRide>(shareKey(id)) : null;

export {readSharedRide, saveSharedRide, ShareError};
export type {SharedRide};
