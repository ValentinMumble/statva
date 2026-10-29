import {gunzipSync, gzipSync} from 'node:zlib';
import {StravaActivity, UPLOAD_EXTERNAL_ID_PREFIX} from './activities.js';
import {athleteKey} from './keys.js';
import {redis} from './redis.js';
import {stravaGet, stravaPut, stravaUpload} from './strava.js';
import {refreshActivity} from './sync.js';

/**
 * Merges activities recorded in several parts (a watch stopped and started again) into one:
 * their data streams are joined in time order into a TCX file, uploaded to Strava as a new
 * activity with the name, bike and commute flag the rider chose. Strava's API cannot delete
 * activities, so the rider deletes the parts on Strava afterwards.
 *
 * Strava may refuse the upload as a duplicate of a part. The file is then kept, so it can go
 * up again once the parts are deleted: by then their data is gone from Strava.
 */

type Point = {
  time: number;
  position?: [number, number];
  altitude?: number;
  distance?: number;
  heartRate?: number;
  cadence?: number;
  power?: number;
};

type Streams = Partial<
  Record<'time' | 'latlng' | 'altitude' | 'distance' | 'heartrate' | 'cadence' | 'watts', {data: unknown[]}>
>;

type Part = {activity: StravaActivity; streams: Streams};

type MergeChoice = {name: string; gearId: string; commute: boolean};

// What an upload carries besides its file.
type UploadFields = {name: string; description: string; sportType: string; trainer: boolean; commute: boolean};

// What a merge waiting for its parts to be deleted keeps, besides its file.
type PendingMerge = MergeChoice & {
  sportType: string;
  trainer: boolean;
  description: string;
  parts: {id: number; name: string; start_date: string}[];
  error: string;
};

type MergeResult =
  | {outcome: 'merged'; activity: StravaActivity; parts: number[]}
  | {outcome: 'refused'; pending: PendingMerge}
  | {outcome: 'processing'; parts: number[]};

class UploadError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const MIN_PARTS = 2;
const MAX_PARTS = 10;
const STREAM_KEYS = 'time,latlng,altitude,distance,heartrate,cadence,watts';
// Strava asks for its upload status no more than once a second; a merge settles in a few.
const POLL_MS = 2000;
const POLLS = 20;
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** How far the points go: the last distance among them, or the fallback without any. */
const lastDistance = (points: Point[], fallback = 0): number => {
  for (let index = points.length - 1; 0 <= index; index--) {
    const {distance} = points[index];
    if (undefined !== distance) return distance;
  }

  return fallback;
};

const pointsOf = ({activity, streams}: Part): Point[] => {
  const start = new Date(activity.start_date).getTime();
  const value = <T>(key: keyof Streams, index: number): T | undefined => streams[key]?.data?.[index] as T | undefined;

  return (streams.time?.data ?? []).map((seconds, index) => ({
    time: start + Number(seconds) * 1000,
    position: value<[number, number]>('latlng', index),
    altitude: value<number>('altitude', index),
    distance: value<number>('distance', index),
    heartRate: value<number>('heartrate', index),
    cadence: value<number>('cadence', index),
    power: value<number>('watts', index),
  }));
};

/**
 * The parts' points in time order, the distance running on from one part to the next. Parts
 * must follow one another: overlapping ones were recorded twice, not in parts.
 */
const joinParts = (parts: Part[]): Point[] => {
  const joined: Point[] = [];
  let covered = 0;

  for (const part of [...parts].sort((first, second) =>
    first.activity.start_date.localeCompare(second.activity.start_date),
  )) {
    const points = pointsOf(part);
    if (0 === points.length) throw new UploadError(`"${part.activity.name}" has no recorded data to merge`, 422);
    if (0 < joined.length && points[0].time <= joined[joined.length - 1].time)
      throw new UploadError(`"${part.activity.name}" overlaps the part before it`, 422);

    const offset = covered;
    for (const point of points)
      joined.push(undefined === point.distance ? point : {...point, distance: point.distance + offset});
    covered = lastDistance(joined, covered);
  }

  return joined;
};

// TCX only knows three sports; the exact one goes with the upload.
const tcxSport = (sport: string): string =>
  sport.includes('Ride') ? 'Biking' : /Run|Walk|Hike/.test(sport) ? 'Running' : 'Other';

/** The joined points as a TCX file: one lap, no device, every stream Strava sent. */
const buildTcx = (sport: string, points: Point[]): string => {
  const start = new Date(points[0].time).toISOString();
  const elapsed = (points[points.length - 1].time - points[0].time) / 1000;
  const distance = lastDistance(points);
  const trackpoints = points.map(({time, position, altitude, distance: covered, heartRate, cadence, power}) => {
    const fields = [`<Time>${new Date(time).toISOString()}</Time>`];
    if (position)
      fields.push(
        `<Position><LatitudeDegrees>${position[0]}</LatitudeDegrees><LongitudeDegrees>${position[1]}</LongitudeDegrees></Position>`,
      );
    if (undefined !== altitude) fields.push(`<AltitudeMeters>${altitude}</AltitudeMeters>`);
    if (undefined !== covered) fields.push(`<DistanceMeters>${covered}</DistanceMeters>`);
    if (undefined !== heartRate) fields.push(`<HeartRateBpm><Value>${heartRate}</Value></HeartRateBpm>`);
    if (undefined !== cadence) fields.push(`<Cadence>${cadence}</Cadence>`);
    if (undefined !== power) fields.push(`<Extensions><ns3:TPX><ns3:Watts>${power}</ns3:Watts></ns3:TPX></Extensions>`);

    return `<Trackpoint>${fields.join('')}</Trackpoint>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2" xmlns:ns3="http://www.garmin.com/xmlschemas/ActivityExtension/v2">
<Activities><Activity Sport="${tcxSport(sport)}"><Id>${start}</Id>
<Lap StartTime="${start}"><TotalTimeSeconds>${elapsed}</TotalTimeSeconds><DistanceMeters>${distance}</DistanceMeters><Intensity>Active</Intensity><TriggerMethod>Manual</TriggerMethod>
<Track>${trackpoints.join('\n')}</Track></Lap>
</Activity></Activities></TrainingCenterDatabase>
`;
};

const readPart = async (athleteId: number, id: number): Promise<Part> => {
  const response = await stravaGet(athleteId, `activities/${id}`);
  if (404 === response.status) throw new UploadError('The activity is not on Strava any more', 404);
  if (!response.ok) throw new UploadError(`Strava sent an activity with ${response.status}`, 502);
  const activity = (await response.json()) as StravaActivity;

  const streams = await stravaGet(
    athleteId,
    `activities/${id}/streams`,
    new URLSearchParams({keys: STREAM_KEYS, key_by_type: 'true'}),
  );
  if (!streams.ok) throw new UploadError(`"${activity.name}" has no recorded data`, 422);

  return {activity, streams: (await streams.json()) as Streams};
};

type UploadAnswer = {id?: number; id_str?: string; error?: string | null; status?: string; activity_id?: number | null};

/**
 * Uploads a TCX file (a merge, a copy) and waits for Strava to make it an activity: its id, the
 * error Strava gave, or null while it is still busy.
 */
const upload = async (
  athleteId: number,
  file: string,
  fields: UploadFields,
  kind: 'merge' | 'copy',
): Promise<number | {error: string} | null> => {
  const form = new FormData();
  form.append('file', new Blob([file]), `${kind}.tcx`);
  form.append('data_type', 'tcx');
  // Given now: Strava decides at upload whether to take its own map's elevation, by sport.
  form.append('sport_type', fields.sportType);
  form.append('name', fields.name);
  form.append('description', fields.description);
  form.append('trainer', fields.trainer ? '1' : '0');
  form.append('commute', fields.commute ? '1' : '0');
  form.append('external_id', `${UPLOAD_EXTERNAL_ID_PREFIX}${kind}-${Date.now()}.tcx`);

  const response = await stravaUpload(athleteId, form);
  if (401 === response.status || 403 === response.status) throw new UploadError('No write access', 403);
  let answer = (await response.json().catch(() => ({}))) as UploadAnswer;
  if (!response.ok && !answer.error) throw new UploadError(`Strava refused the upload with ${response.status}`, 502);

  for (let poll = 0; !answer.activity_id && !answer.error && poll < POLLS; poll++) {
    await sleep(POLL_MS);
    answer = (await (await stravaGet(athleteId, `uploads/${answer.id_str ?? answer.id}`)).json()) as UploadAnswer;
  }

  if (answer.error) return {error: answer.error};

  return answer.activity_id ?? null;
};

/** After an upload: what a file cannot carry (the gear), then the activity stored in Statva. */
const finish = async (
  athleteId: number,
  activityId: number,
  update: Record<string, unknown>,
): Promise<StravaActivity> => {
  await stravaPut(athleteId, `activities/${activityId}`, update);

  return (await refreshActivity(athleteId, activityId)) ?? ({id: activityId} as StravaActivity);
};

const mergeKey = (athleteId: number): string => athleteKey(athleteId, 'merge');

const uploadAndFinish = async (athleteId: number, file: string, pending: PendingMerge): Promise<MergeResult> => {
  const parts = pending.parts.map(({id}) => id);
  const uploaded = await upload(athleteId, file, pending, 'merge');

  if (null === uploaded) {
    await redis().del(mergeKey(athleteId));
    return {outcome: 'processing', parts};
  }
  if ('number' !== typeof uploaded) {
    // Kept for a retry, as the parts' data goes once they are deleted.
    const refused = {...pending, error: uploaded.error};
    await redis().hset(mergeKey(athleteId), {
      pending: refused,
      file: gzipSync(file).toString('base64'),
    });
    return {outcome: 'refused', pending: refused};
  }

  await redis().del(mergeKey(athleteId));
  return {outcome: 'merged', activity: await finish(athleteId, uploaded, {gear_id: pending.gearId}), parts};
};

/** Merges the activities into a new one on Strava, with the rider's name, bike and commute flag. */
const mergeActivities = async (athleteId: number, ids: number[], choice: MergeChoice): Promise<MergeResult> => {
  const unique = [...new Set(ids)];
  if (unique.length < MIN_PARTS || unique.length > MAX_PARTS)
    throw new UploadError(`Merge ${MIN_PARTS} to ${MAX_PARTS} activities`, 400);

  const parts: Part[] = [];
  for (const id of unique) parts.push(await readPart(athleteId, id));

  const ordered = [...parts].sort((first, second) =>
    first.activity.start_date.localeCompare(second.activity.start_date),
  );
  const file = buildTcx(String(ordered[0].activity.sport_type), joinParts(parts));
  const descriptions = [...new Set(ordered.map(({activity}) => String(activity.description ?? '').trim()))];

  return await uploadAndFinish(athleteId, file, {
    ...choice,
    sportType: String(ordered[0].activity.sport_type),
    trainer: Boolean(ordered[0].activity.trainer),
    description: descriptions.filter(description => '' !== description).join('\n\n'),
    parts: ordered.map(({activity}) => ({
      id: activity.id,
      name: String(activity.name),
      start_date: activity.start_date,
    })),
    error: '',
  });
};

/** The merge Strava refused, waiting for its parts to be deleted, if any. */
const pendingMerge = async (athleteId: number): Promise<PendingMerge | null> =>
  await redis().hget<PendingMerge>(mergeKey(athleteId), 'pending');

/** Uploads the refused merge again, once its parts are deleted. */
const retryMerge = async (athleteId: number): Promise<MergeResult> => {
  const stored = await redis().hmget<{pending: PendingMerge; file: string}>(mergeKey(athleteId), 'pending', 'file');
  if (!stored?.pending || !stored.file) throw new UploadError('No merge is waiting', 404);

  return await uploadAndFinish(athleteId, gunzipSync(Buffer.from(stored.file, 'base64')).toString(), stored.pending);
};

const discardMerge = async (athleteId: number): Promise<void> => {
  await redis().del(mergeKey(athleteId));
};

export {
  buildTcx,
  discardMerge,
  finish,
  joinParts,
  MAX_PARTS,
  mergeActivities,
  pendingMerge,
  pointsOf,
  readPart,
  retryMerge,
  upload,
  UploadError,
};
export type {MergeChoice, MergeResult, PendingMerge, Point};
