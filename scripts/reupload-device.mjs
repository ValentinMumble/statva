/**
 * Re-uploads activities to Strava with another recording device, for rides recorded on
 * the wrong one. Strava cannot change an activity's device, and refuses a second copy of
 * a ride while the first exists, so it happens in two steps with you in between:
 *
 * 1. --prepare (read only): each matching activity is rebuilt from its data streams into
 *    a file naming the new device (TCX or FIT, whichever Strava recognises it from), saved
 *    with its details and photos in a folder.
 * 2. You delete the originals on Strava (the API cannot delete activities).
 * 3. --upload: each prepared ride whose original is gone is uploaded with the same name,
 *    description, gear and indoor flag, and muted (kept off followers' feeds). A ride whose
 *    original still exists is skipped, so nothing is ever duplicated.
 *
 * Photos cannot be uploaded through the API: re-add them by hand from each folder.
 * Uploads take the account's default visibility: set it to "Only you" first if needed.
 *
 * Usage:
 *   node scripts/reupload-device.mjs --prepare --from "Garmin Edge 1030 Plus" --to MyWhoosh [--limit 1]
 *   node scripts/reupload-device.mjs --prepare --from "Strava GPX" --to none
 *   node scripts/reupload-device.mjs --upload [--limit 1]
 *
 * --upload asks for a Strava login with write access: it prints a link to approve, and
 * keeps that access for this run only.
 */
import {Encoder, Profile} from '@garmin/fitsdk';
import {Redis} from '@upstash/redis';
import {createServer} from 'http';
import {mkdir, readdir, readFile, writeFile} from 'fs/promises';
import {existsSync} from 'fs';
import {homedir} from 'os';
import {join} from 'path';
import {pathToFileURL} from 'url';
import {loadEnv, ownerAccessToken, REDIS_KEYS, STRAVA_KEYS} from './env.mjs';

const env = loadEnv([...STRAVA_KEYS, ...REDIS_KEYS]);
const redis = new Redis({
  url: env.KV_REST_API_URL,
  token: env.KV_REST_API_TOKEN,
});
const API = 'https://www.strava.com/api/v3';
const CALLBACK_PORT = 8723;
const OUT = join(homedir(), 'Downloads', 'statva-reupload');

const arg = name => {
  const index = process.argv.indexOf(`--${name}`);

  return -1 === index ? undefined : process.argv[index + 1];
};
const from = arg('from');
const to = arg('to');
const limit = Number(arg('limit') ?? Infinity);
const isPrepare = process.argv.includes('--prepare');
const isUpload = process.argv.includes('--upload');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const stravaJson = async (token, path, init = {}) => {
  const response = await fetch(`${API}/${path}`, {
    ...init,
    headers: {Authorization: `Bearer ${token}`, ...(init.headers ?? {})},
  });

  // Strava's limits reset every quarter of an hour: wait for the next one and try again.
  if (429 === response.status) {
    const wait = 15 * 60 * 1000 - (Date.now() % (15 * 60 * 1000)) + 5000;
    console.log(`  Strava's rate limit is reached, waiting ${Math.ceil(wait / 60000)} min...`);
    await sleep(wait);

    return await stravaJson(token, path, init);
  }
  if (!response.ok) throw new Error(`${init.method ?? 'GET'} ${path}: ${response.status} ${await response.text()}`);

  return await response.json();
};

/** Asks the rider to approve write access in the browser, and catches the answer on localhost. */
const writeAccessToken = async () => {
  const redirect = `http://localhost:${CALLBACK_PORT}/callback`;
  const params = new URLSearchParams({
    client_id: env.STRAVA_CLIENT_ID,
    redirect_uri: redirect,
    response_type: 'code',
    approval_prompt: 'force',
    scope: 'read,activity:read_all,activity:write',
  });
  console.log(
    `\nOpen this link and approve write access (for this run only):\n\nhttps://www.strava.com/oauth/authorize?${params}\n`,
  );

  const code = await new Promise((resolve, reject) => {
    const server = createServer((request, response) => {
      const url = new URL(request.url, redirect);
      const given = url.searchParams.get('code');
      response.end(given ? 'Approved. You can close this tab and go back to the terminal.' : 'Not approved.');
      server.close();
      given && url.searchParams.get('scope')?.includes('activity:write')
        ? resolve(given)
        : reject(new Error('Write access was not approved.'));
    });
    server.listen(CALLBACK_PORT);
  });

  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      client_id: env.STRAVA_CLIENT_ID,
      client_secret: env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) throw new Error(`Could not get write access: ${response.status}`);

  return (await response.json()).access_token;
};

// How a file makes Strava show each device. Strava matches a TCX file's creator name, or a
// FIT file's maker and product ids, against its own list of devices, and shows nothing when
// it finds no match. It knows MyWhoosh by name only (in a FIT file it does not know MyWhoosh's
// ids), and the Apple Watch Series 10 by the ids the Strava app writes for it. "none" is a
// TCX file with no creator at all, which leaves the activity without a device.
const DEVICES = {
  none: {format: 'tcx'},
  MyWhoosh: {format: 'tcx'},
  'Apple Watch Series 10': {
    format: 'fit',
    manufacturer: 'strava',
    product: 1165,
  },
};
const deviceOf = name => {
  if (!DEVICES[name]) throw new Error(`Unknown device "${name}". Known: ${Object.keys(DEVICES).join(', ')}.`);

  return DEVICES[name];
};

const fitSport = sport =>
  'VirtualRide' === sport
    ? {sport: 'cycling', subSport: 'virtualActivity'}
    : sport.includes('Ride')
      ? {sport: 'cycling', subSport: 'generic'}
      : {sport: 'generic', subSport: 'generic'};

const SEMICIRCLES = 2 ** 31 / 180;

/** The points of an activity, from its data streams. */
const pointsOf = (activity, streams) => {
  const start = new Date(activity.start_date).getTime();
  const value = (key, index) => streams[key]?.data?.[index];

  return (streams.time?.data ?? []).map((seconds, index) => ({
    time: new Date(start + seconds * 1000),
    position: value('latlng', index),
    altitude: value('altitude', index),
    distance: value('distance', index),
    heartRate: value('heartrate', index),
    cadence: value('cadence', index),
    power: value('watts', index),
  }));
};

const escape = text => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// TCX only knows three sports; the exact one is given with the upload.
const tcxSport = sport => (sport.includes('Ride') ? 'Biking' : /Run|Walk|Hike/.test(sport) ? 'Running' : 'Other');

/** The activity as a TCX file naming the new device. */
const buildTcx = (activity, points, device) => {
  const start = points[0].time.toISOString();
  const elapsed = (points.at(-1).time - points[0].time) / 1000;
  const distance = points.findLast(({distance}) => undefined !== distance)?.distance ?? 0;
  const trackpoints = points.map(({time, position, altitude, distance: covered, heartRate, cadence, power}) => {
    const parts = [`<Time>${time.toISOString()}</Time>`];
    if (position)
      parts.push(
        `<Position><LatitudeDegrees>${position[0]}</LatitudeDegrees><LongitudeDegrees>${position[1]}</LongitudeDegrees></Position>`,
      );
    if (undefined !== altitude) parts.push(`<AltitudeMeters>${altitude}</AltitudeMeters>`);
    if (undefined !== covered) parts.push(`<DistanceMeters>${covered}</DistanceMeters>`);
    if (undefined !== heartRate) parts.push(`<HeartRateBpm><Value>${heartRate}</Value></HeartRateBpm>`);
    if (undefined !== cadence) parts.push(`<Cadence>${cadence}</Cadence>`);
    if (undefined !== power) parts.push(`<Extensions><ns3:TPX><ns3:Watts>${power}</ns3:Watts></ns3:TPX></Extensions>`);

    return `<Trackpoint>${parts.join('')}</Trackpoint>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2" xmlns:ns3="http://www.garmin.com/xmlschemas/ActivityExtension/v2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<Activities><Activity Sport="${tcxSport(activity.sport_type)}"><Id>${start}</Id>
<Lap StartTime="${start}"><TotalTimeSeconds>${elapsed}</TotalTimeSeconds><DistanceMeters>${distance}</DistanceMeters><Intensity>Active</Intensity><TriggerMethod>Manual</TriggerMethod>
<Track>${trackpoints.join('\n')}</Track></Lap>
${'none' === device ? '' : `<Creator xsi:type="Device_t"><Name>${escape(device)}</Name><UnitId>0</UnitId><ProductID>0</ProductID><Version><VersionMajor>1</VersionMajor><VersionMinor>0</VersionMinor></Version></Creator>\n`}</Activity></Activities></TrainingCenterDatabase>
`;
};

/** The activity as a FIT file naming the new device. */
const buildFit = (activity, points, device) => {
  const encoder = new Encoder();
  const first = points[0].time;
  const last = points.at(-1).time;
  const elapsed = (last - first) / 1000;
  const distance = points.findLast(({distance}) => undefined !== distance)?.distance ?? 0;
  const {sport, subSport} = fitSport(activity.sport_type);
  const {manufacturer, product} = deviceOf(device);

  encoder.onMesg(Profile.MesgNum.FILE_ID, {
    type: 'activity',
    manufacturer,
    product,
    serialNumber: 1,
    timeCreated: first,
  });
  encoder.onMesg(Profile.MesgNum.EVENT, {
    timestamp: first,
    event: 'timer',
    eventType: 'start',
  });

  for (const {time, position, altitude, distance: covered, heartRate, cadence, power} of points) {
    const record = {timestamp: time};
    if (position)
      Object.assign(record, {
        positionLat: Math.round(position[0] * SEMICIRCLES),
        positionLong: Math.round(position[1] * SEMICIRCLES),
      });
    if (undefined !== altitude) record.altitude = altitude;
    if (undefined !== covered) record.distance = covered;
    if (undefined !== heartRate) record.heartRate = heartRate;
    if (undefined !== cadence) record.cadence = cadence;
    if (undefined !== power) record.power = power;
    encoder.onMesg(Profile.MesgNum.RECORD, record);
  }

  const totals = {
    startTime: first,
    totalElapsedTime: elapsed,
    totalTimerTime: elapsed,
    totalDistance: distance,
  };
  encoder.onMesg(Profile.MesgNum.EVENT, {
    timestamp: last,
    event: 'timer',
    eventType: 'stopAll',
  });
  encoder.onMesg(Profile.MesgNum.LAP, {
    timestamp: last,
    ...totals,
    sport,
    subSport,
  });
  encoder.onMesg(Profile.MesgNum.SESSION, {
    timestamp: last,
    ...totals,
    sport,
    subSport,
    firstLapIndex: 0,
    numLaps: 1,
  });
  encoder.onMesg(Profile.MesgNum.ACTIVITY, {
    timestamp: last,
    totalTimerTime: elapsed,
    numSessions: 1,
    type: 'manual',
    event: 'activity',
    eventType: 'stop',
  });

  return encoder.close();
};

/** The activity as the file that makes Strava show the device: its name and its content. */
const buildFile = (activity, points, device) => {
  const {format} = deviceOf(device);

  return {
    name: `activity.${format}`,
    format,
    content: 'tcx' === format ? buildTcx(activity, points, device) : buildFit(activity, points, device),
  };
};

const savePhotos = async (token, activity, folder) => {
  if (0 === (activity.total_photo_count ?? 0)) return 0;

  const photos = await stravaJson(token, `activities/${activity.id}/photos?size=5000&photo_sources=true`);
  let saved = 0;

  for (const [index, {urls}] of photos.entries()) {
    const url = Object.entries(urls ?? {}).sort(([a], [b]) => Number(b) - Number(a))[0]?.[1];
    if (!url) continue;
    const image = await fetch(url);
    if (!image.ok) continue;
    await writeFile(join(folder, `${index + 1}.jpg`), Buffer.from(await image.arrayBuffer()));
    saved++;
  }

  return saved;
};

const upload = async (token, activity, file) => {
  // activity: the saved details (name, description, gear, sport, flags) of the original.
  const form = new FormData();
  form.append('file', new Blob([file.content]), `statva-${activity.id}.${file.format}`);
  form.append('data_type', file.format);
  // Given now rather than after: Strava decides at upload whether to replace the elevation
  // of the file with its own map's, which it does for rides outdoors but not virtual ones.
  form.append('sport_type', activity.sport_type);
  form.append('name', activity.name);
  form.append('description', activity.description ?? '');
  form.append('trainer', activity.trainer ? '1' : '0');
  form.append('commute', activity.commute ? '1' : '0');
  form.append('external_id', `statva-reupload-${activity.id}.${file.format}`);

  let status = await stravaJson(token, 'uploads', {
    method: 'POST',
    body: form,
  });

  for (let tries = 0; !status.activity_id && !status.error && tries < 30; tries++) {
    // Every check counts against Strava's read limit, so they are spaced out.
    await sleep(4000);
    status = await stravaJson(token, `uploads/${status.id_str ?? status.id}`);
  }
  if (status.error || !status.activity_id) throw new Error(`Upload failed: ${status.error ?? status.status}`);

  return status.activity_id;
};

/** Sets what the file cannot carry (the gear and the mute flag), and returns the activity as it now is. */
const finish = async (token, activity, id) =>
  await stravaJson(token, `activities/${id}`, {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      sport_type: activity.sport_type,
      gear_id: activity.gear_id ?? 'none',
      trainer: activity.trainer,
      hide_from_home: true,
    }),
  });

// As api/_lib/activities.ts stores an activity. Strava's webhook fetches a new activity
// before its gear is set, and sends no event for a gear change, so Statva would keep the
// default bike: the finished activity is stored here instead.
const DROPPED_FROM_DETAILS = ['splits_metric', 'splits_standard', 'laps', 'similar_activities', 'stats_visibility'];
const DROPPED_FROM_SUMMARY = [
  ...DROPPED_FROM_DETAILS,
  'segment_efforts',
  'best_efforts',
  'description',
  'private_note',
  'photos',
];
const without = (activity, fields) =>
  Object.fromEntries(Object.entries(activity).filter(([field]) => !fields.includes(field)));

const storeInStatva = async detail => {
  const owner = env.STRAVA_ATHLETE_IDS.split(',')[0].trim();
  const summary = without(detail, DROPPED_FROM_SUMMARY);
  if (detail.map) summary.map = {id: detail.map.id, summary_polyline: detail.map.summary_polyline};
  const stored = {
    ...without(detail, DROPPED_FROM_DETAILS),
    segment_efforts: (detail.segment_efforts ?? []).map(({kom_rank}) => ({kom_rank: kom_rank ?? null})),
  };

  await redis.hset(`athlete:${owner}:activities`, {[detail.id]: summary});
  await redis.hset(`athlete:${owner}:details`, {[detail.id]: stored});
};

/** Step 1: rebuild every matching activity into a folder, with its details and photos. Reads only. */
const prepare = async () => {
  if (!from || !to)
    throw new Error('Say which device to replace and with what: --from "Garmin Edge 1030 Plus" --to MyWhoosh');

  const owner = env.STRAVA_ATHLETE_IDS.split(',')[0].trim();
  const details = Object.values((await redis.hgetall(`athlete:${owner}:details`)) ?? {});
  const targets = details
    // The exact name: "Strava" must not also pick "Strava GPX" or "Strava App".
    .filter(({device_name}) => from === device_name)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .slice(0, limit);

  console.log(`${targets.length} activities recorded on "${from}" will become "${to}".\n`);
  const readToken = await ownerAccessToken(redis);

  for (const activity of targets) {
    const folder = join(
      OUT,
      `${activity.start_date.slice(0, 10)} ${activity.name.replace(/[/\\:]/g, '-')} (${activity.id})`,
    );
    await mkdir(folder, {recursive: true});
    const streams = await stravaJson(
      readToken,
      `activities/${activity.id}/streams?keys=time,latlng,altitude,distance,heartrate,cadence,watts&key_by_type=true`,
    );
    const file = buildFile(activity, pointsOf(activity, streams), to);
    await writeFile(join(folder, file.name), file.content);
    const {id, name, description, gear_id, sport_type, trainer, commute, private: isPrivate, start_date} = activity;
    await writeFile(
      join(folder, 'activity.json'),
      JSON.stringify(
        {
          id,
          name,
          description,
          gear_id,
          sport_type,
          trainer,
          commute,
          private: isPrivate,
          start_date,
          device: to,
          original: `https://www.strava.com/activities/${id}`,
        },
        null,
        2,
      ),
    );
    const photos = await savePhotos(readToken, activity, folder);
    console.log(`  ${start_date.slice(0, 10)}  ${name}: ${streams.time?.data?.length ?? 0} points, ${photos} photos`);
    console.log(`      delete: https://www.strava.com/activities/${id}`);
    await sleep(500);
  }

  console.log(`\nSaved in ${OUT}. Delete the originals above on Strava, then run --upload.`);
};

/** Step 3: upload each prepared ride whose original is gone; skip the others. */
const uploadPrepared = async () => {
  const folders = existsSync(OUT)
    ? (await readdir(OUT, {withFileTypes: true})).filter(entry => entry.isDirectory()).map(({name}) => join(OUT, name))
    : [];
  const pending = [];

  for (const folder of folders) {
    if (existsSync(join(folder, 'uploaded.json')) || !existsSync(join(folder, 'activity.json'))) continue;
    pending.push(folder);
  }
  const chosen = pending.sort().slice(0, limit);
  console.log(`${chosen.length} prepared rides to upload.`);
  if (0 === chosen.length) return;

  const readToken = await ownerAccessToken(redis);
  const ready = [];

  // Strava refuses a copy while the original exists: only rides whose original is gone go up.
  // A new ride made from another one (original: null) has nothing to wait for.
  for (const folder of chosen) {
    const saved = JSON.parse(await readFile(join(folder, 'activity.json'), 'utf8'));
    if (null === saved.original) {
      ready.push({folder, saved});
      continue;
    }
    const response = await fetch(`${API}/activities/${saved.id}`, {
      headers: {Authorization: `Bearer ${readToken}`},
    });
    if (404 === response.status) ready.push({folder, saved});
    else console.log(`  skip ${saved.name}: the original still exists (${saved.original})`);
  }
  if (0 === ready.length) return console.log('\nNothing to upload yet: delete the originals first.');

  const writeToken = await writeAccessToken();

  for (const {folder, saved} of ready) {
    const {format} = deviceOf(saved.device);
    const newId = await upload(writeToken, saved, {
      format,
      content: await readFile(join(folder, `activity.${format}`)),
    });
    const result = {new: `https://www.strava.com/activities/${newId}`, device: null};
    // Recorded at once, so a run stopped by Strava's rate limit never uploads a ride twice.
    await writeFile(join(folder, 'uploaded.json'), JSON.stringify(result, null, 2));
    const finished = await finish(writeToken, saved, newId);
    await storeInStatva(finished);
    result.device = finished.device_name ?? null;
    await writeFile(join(folder, 'uploaded.json'), JSON.stringify(result, null, 2));
    console.log(`  ${saved.name}: ${result.new}, device "${result.device ?? 'none'}"`);
    await sleep(1500);
  }
};

const main = async () => {
  if (isPrepare) return await prepare();
  if (isUpload) return await uploadPrepared();

  throw new Error('Run with --prepare (then delete the originals) or --upload.');
};

// Run as a script; other scripts may import the FIT builder.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error.message ?? error);
    process.exit(1);
  });
}

export {buildFile, finish, pointsOf, storeInStatva, upload, writeAccessToken};
