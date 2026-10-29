import {install} from './fakes.js';
import {joinParts} from '../_lib/merge.js';
import {sessionCookie} from '../_lib/session.js';
import {DELETE as discard, GET as pending, POST as merge} from '../activity.js';

const ORIGIN = 'https://statva.test';

const call = async (handler: (request: Request) => Promise<Response>, method: string, body?: unknown) =>
  await handler(
    new Request(`${ORIGIN}/api/activity?action=merge`, {
      method,
      headers: {'Content-Type': 'application/json', cookie: sessionCookie(42).split(';')[0]},
      ...(undefined === body ? {} : {body: JSON.stringify(body)}),
    }),
  );

// A ride recorded in two parts on a watch: 5 minutes, a stop, then 5 more.
const withParts = () => {
  const fake = install();
  fake.login(42);
  fake.strava.activities = [
    {id: 1002, name: 'Afternoon Ride 2', sport_type: 'Ride', start_date: '2026-10-28T14:10:00Z', description: ''},
    {id: 1001, name: 'Afternoon Ride', sport_type: 'Ride', start_date: '2026-10-28T14:00:00Z', description: 'Windy'},
  ];
  fake.strava.streams = {
    1001: {
      time: {data: [0, 300]},
      distance: {data: [0, 2000]},
      latlng: {
        data: [
          [47.2, -1.5],
          [47.21, -1.51],
        ],
      },
      heartrate: {data: [120, 140]},
    },
    1002: {
      time: {data: [0, 300]},
      distance: {data: [0, 2500]},
      latlng: {
        data: [
          [47.21, -1.51],
          [47.22, -1.52],
        ],
      },
    },
  };
  return fake;
};

const choice = {ids: [1002, 1001], name: 'Ride to the lake 🌊', gear_id: 'b1', commute: true};

describe('joining parts', () => {
  const part = (id: number, start: string, times: number[], distances: number[]) => ({
    activity: {id, name: `Part ${id}`, start_date: start},
    streams: {time: {data: times}, distance: {data: distances}},
  });

  it('puts the points in time order, the distance running on from part to part', () => {
    const points = joinParts([
      part(2, '2026-10-28T14:10:00Z', [0, 60], [0, 500]),
      part(1, '2026-10-28T14:00:00Z', [0, 60], [0, 400]),
    ]);

    expect(points.map(({time}) => new Date(time).toISOString())).toEqual([
      '2026-10-28T14:00:00.000Z',
      '2026-10-28T14:01:00.000Z',
      '2026-10-28T14:10:00.000Z',
      '2026-10-28T14:11:00.000Z',
    ]);
    expect(points.map(({distance}) => distance)).toEqual([0, 400, 400, 900]);
  });

  it('refuses parts that overlap, or have no recorded data', () => {
    expect(() =>
      joinParts([part(1, '2026-10-28T14:00:00Z', [0, 600], [0, 1]), part(2, '2026-10-28T14:05:00Z', [0, 60], [0, 1])]),
    ).toThrow('overlaps');
    expect(() =>
      joinParts([part(1, '2026-10-28T14:00:00Z', [], []), part(2, '2026-10-28T15:00:00Z', [0], [0])]),
    ).toThrow('no recorded data');
  });
});

describe('merging activities', () => {
  it('uploads one activity from the parts, with the name, bike and commute flag chosen, and stores it', async () => {
    const fake = withParts();

    const response = await call(merge, 'POST', choice);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      outcome: 'merged',
      parts: [1001, 1002],
      activity: {id: 9001, name: 'Ride to the lake 🌊'},
    });

    const [upload] = fake.strava.uploads;
    expect(upload).toMatchObject({
      data_type: 'tcx',
      sport_type: 'Ride',
      name: 'Ride to the lake 🌊',
      commute: '1',
      description: 'Windy',
    });
    expect(upload.external_id).toMatch(/^statva-merge-/);
    expect(upload.file.match(/<Trackpoint>/g)).toHaveLength(4);
    expect(upload.file).toContain('<Id>2026-10-28T14:00:00.000Z</Id>');
    expect(upload.file).toContain('<DistanceMeters>4500</DistanceMeters>');
    expect(fake.strava.puts).toEqual([{id: 9001, gear_id: 'b1'}]);
    expect(fake.read('athlete:42:activities')['9001']).toMatchObject({gear_id: 'b1', commute: true});
  });

  it('keeps the file when Strava refuses it, and uploads it again once the parts are deleted', async () => {
    const fake = withParts();
    fake.strava.uploadError = 'merged.tcx duplicate of activity 1001';

    const refused = await call(merge, 'POST', choice);
    expect(refused.status).toBe(409);
    expect(await refused.json()).toMatchObject({
      outcome: 'refused',
      pending: {
        name: 'Ride to the lake 🌊',
        error: 'merged.tcx duplicate of activity 1001',
        parts: [{id: 1001}, {id: 1002}],
      },
    });
    expect(await (await call(pending, 'GET')).json()).toMatchObject({pending: {name: 'Ride to the lake 🌊'}});

    // The rider deletes the parts on Strava: their data is gone, the kept file is not.
    fake.strava.activities = [];
    fake.strava.streams = {};
    fake.strava.uploadError = null;
    const retried = await call(merge, 'POST', {retry: true});

    expect(retried.status).toBe(200);
    expect(fake.strava.uploads[1].file).toBe(fake.strava.uploads[0].file);
    expect(await (await call(pending, 'GET')).json()).toEqual({pending: null});
  });

  it('forgets a waiting merge on request', async () => {
    const fake = withParts();
    fake.strava.uploadError = 'duplicate';
    await call(merge, 'POST', choice);

    await call(discard, 'DELETE');

    expect(await (await call(pending, 'GET')).json()).toEqual({pending: null});
    expect((await call(merge, 'POST', {retry: true})).status).toBe(404);
  });

  it('needs 2 to 10 activities, a name and gear', async () => {
    withParts();

    expect((await call(merge, 'POST', {...choice, ids: [1001]})).status).toBe(400);
    expect(
      (await call(merge, 'POST', {...choice, ids: Array.from({length: 11}, (_, index) => index + 1)})).status,
    ).toBe(400);
    expect((await call(merge, 'POST', {...choice, name: ' '})).status).toBe(400);
    expect((await call(merge, 'POST', {...choice, gear_id: 'bike'})).status).toBe(400);
  });

  it('says when a part is not on Strava any more', async () => {
    withParts();

    expect((await call(merge, 'POST', {...choice, ids: [1001, 404]})).status).toBe(404);
  });
});
