import {install} from './fakes.js';
import {copyForToday, todayAtSameTime} from '../_lib/copy.js';
import {sessionCookie} from '../_lib/session.js';
import {POST as copy} from '../copy.js';

// A commute ridden on 12 Oct at 13:15:01 in Paris, 10 minutes long.
const withCommute = (startLocal = '2026-10-12T13:15:01Z', start = '2026-10-12T11:15:01Z') => {
  const fake = install();
  fake.login(42);
  fake.strava.activities = [
    {
      id: 7001,
      name: 'Blum Kerdiret 🦝',
      sport_type: 'Ride',
      start_date: start,
      start_date_local: startLocal,
      timezone: '(GMT+01:00) Europe/Paris',
      commute: true,
      gear_id: 'b1',
      description: '',
    },
  ];
  fake.strava.streams = {7001: {time: {data: [0, 600]}, distance: {data: [0, 3000]}}};
  return fake;
};

describe('today at the same time', () => {
  it('keeps the wall-clock time where the ride was, summer time or not', () => {
    const winter = todayAtSameTime('2026-10-12T13:15:01Z', 'Europe/Paris', Date.parse('2026-10-29T14:00:00Z'));
    const summer = todayAtSameTime('2026-10-12T13:15:01Z', 'Europe/Paris', Date.parse('2026-10-20T14:00:00Z'));

    expect(new Date(winter).toISOString()).toBe('2026-10-29T12:15:01.000Z');
    expect(new Date(summer).toISOString()).toBe('2026-10-20T11:15:01.000Z');
  });
});

describe('copying a ride to today', () => {
  it('uploads it at the same time today with its name, gear and commute flag, off the feed', async () => {
    const fake = withCommute();

    const result = await copyForToday(42, 7001, Date.parse('2026-10-29T14:00:00Z'));

    expect(result).toMatchObject({outcome: 'copied', activity: {id: 9001, name: 'Blum Kerdiret 🦝'}});
    const [upload] = fake.strava.uploads;
    expect(upload).toMatchObject({name: 'Blum Kerdiret 🦝', sport_type: 'Ride', commute: '1'});
    expect(upload.external_id).toMatch(/^statva-copy-/);
    expect(upload.file).toContain('<Id>2026-10-29T12:15:01.000Z</Id>');
    expect(upload.file).toContain('<Time>2026-10-29T12:25:01.000Z</Time>');
    expect(fake.strava.puts).toEqual([{id: 9001, gear_id: 'b1', hide_from_home: true}]);
    expect(fake.read('athlete:42:activities')['9001']).toMatchObject({gear_id: 'b1'});
  });

  it('waits until that time has passed today', async () => {
    const fake = withCommute();

    await expect(copyForToday(42, 7001, Date.parse('2026-10-29T12:20:00Z'))).rejects.toThrow(
      "Today's ride would end at 13:25",
    );
    expect(fake.strava.uploads).toEqual([]);
  });

  it('answers through its route, saying why when Strava refuses', async () => {
    // Just after midnight, so today's copy is always over.
    const fake = withCommute('2026-10-12T00:00:01Z', '2026-10-11T22:00:01Z');
    const call = async () =>
      await copy(
        new Request('https://statva.test/api/copy?id=7001', {
          method: 'POST',
          headers: {cookie: sessionCookie(42).split(';')[0]},
        }),
      );

    expect((await call()).status).toBe(200);

    fake.strava.uploadError = 'copy.tcx duplicate of activity 9001';
    const refused = await call();
    expect(refused.status).toBe(409);
    expect(await refused.json()).toEqual({error: 'copy.tcx duplicate of activity 9001'});
  });
});
