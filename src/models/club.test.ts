import {buildDetailedActivity} from '../../test/test-util';
import {clubRecords, clubSessions, clubTotals, clubWeeks, groupSize, groupStats, sessionsHeld, startPoints} from './club';
import {ClubRules} from './activity-npeloton';
import {Activity} from './strava';

const CLUB: ClubRules = {name: 'N-Peloton', markers: {Pirate: ['🏴‍☠️']}};

let nextId = 1;
const ride = (day: string, name: string, fields: Partial<Activity> = {}): Activity =>
  buildDetailedActivity({
    id: nextId++,
    name,
    sport_type: 'Ride',
    start_date: `${day}T17:00:00Z`,
    start_date_local: `${day}T19:00:00Z`,
    distance: 40000,
    total_elevation_gain: 200,
    moving_time: 5400,
    average_speed: 8,
    athlete_count: 1,
    device_watts: false,
    start_latlng: [47.2, -1.55],
    kudos_count: 0,
    ...fields,
  } as never) as unknown as Activity;

// Wednesdays: 2026-09-02, 09-09, 09-16, 09-23 (missed), 09-30, 10-07; today is Wednesday 10-14.
const activities = [
  ride('2026-09-02', 'N-Peloton #640 🏴‍☠️', {athlete_count: 8, average_temp: 22, device_watts: true, weighted_average_watts: 210}),
  ride('2026-09-09', 'N-Peloton #641 G2', {athlete_count: 12, average_speed: 9, average_temp: 9}),
  ride('2026-09-16', 'N-Peloton #642 🏴‍☠️', {distance: 60000, start_latlng: [47.2005, -1.5502]}),
  ride('2026-09-30', 'N-Peloton #644 G2', {device_watts: true, weighted_average_watts: 190, kudos_count: 7}),
  ride('2026-10-07', 'N-Peloton #645 🏴‍☠️', {start_latlng: [47.3, -1.4]}),
  ride('2026-10-10', 'Saturday ride', {distance: 100000}),
];
const sessions = clubSessions(activities, {}, CLUB);

describe('clubSessions', () => {
  it('keeps club rides, newest first, with their number and group', () => {
    expect(sessions.map(({number, group}) => [number, group])).toEqual([
      [645, 'Pirate'],
      [644, 'G2'],
      [642, 'Pirate'],
      [641, 'G2'],
      [640, 'Pirate'],
    ]);
  });
});

describe('clubTotals and sessionsHeld', () => {
  it('adds up the sessions and their share of all riding', () => {
    expect(clubTotals(sessions, activities)).toEqual({sessions: 5, distance: 220000, elevation: 1000, time: 27000, share: 220000 / 320000});
  });

  it('counts the sessions the club ran from the numbers', () => {
    expect(sessionsHeld(sessions)).toEqual({attended: 5, held: 6});
  });
});

describe('clubWeeks', () => {
  const weeks = clubWeeks(sessions, '2026-10-14');

  it('lists every week since the first session, gaps included', () => {
    expect(weeks.weeks.map(({session}) => session?.number ?? null)).toEqual([640, 641, 642, null, 644, 645, null]);
  });

  it('finds the longest run, and the current one without this week breaking it', () => {
    expect(weeks.longest).toEqual({length: 3, from: '2026-08-31', to: '2026-09-14'});
    expect(weeks.current).toEqual({length: 2, from: '2026-09-28', to: '2026-10-05'});
    expect(weeks.missedRecently).toBe(1);
  });
});

describe('groupStats and groupSize', () => {
  it('averages speed, power and riders per group', () => {
    expect(groupStats(sessions)).toEqual([
      {name: 'Pirate', sessions: 3, speed: 8, power: 210, riders: 8},
      {name: 'G2', sessions: 2, speed: 8.5, power: 190, riders: 12},
    ]);
  });

  it('skips sessions where Strava matched nobody', () => {
    const size = groupSize(sessions);
    expect(size.average).toBe(10);
    expect(size.biggest?.number).toBe(641);
    expect(size.byMonth[8]).toBe(10);
    expect(size.byMonth[9]).toBeNull();
  });
});

describe('clubRecords and startPoints', () => {
  it('finds the best session for each record', () => {
    const records = Object.fromEntries(clubRecords(sessions).map(({key, session, value}) => [key, [session.number, value]]));

    expect(records.fastest).toEqual([641, 9]);
    expect(records.longest).toEqual([642, 60000]);
    expect(records.power).toEqual([640, 210]);
    expect(records.coldest).toEqual([641, 9]);
    expect(records.hottest).toEqual([640, 22]);
    expect(records.kudos).toEqual([644, 7]);
  });

  it('counts starts a few metres apart as one place', () => {
    expect(startPoints(sessions).map(({sessions: count}) => count)).toEqual([4, 1]);
  });
});
