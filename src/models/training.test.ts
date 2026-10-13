import {buildActivity, buildDetailedActivity} from '../../test/test-util';
import {aerobicEfficiency, commuteRoutes, driftByRide, powerCurveByYear, runBestTimes, zonesPerWeek} from './training';
import {ActivityType, DetailedActivity} from './strava';

const ride = (id: number, date: string, fields: Partial<DetailedActivity> = {}) =>
  buildDetailedActivity({id, name: `Ride ${id}`, sport_type: ActivityType.Ride, start_date: date, start_date_local: date, ...fields});

describe('power curve', () => {
  it('keeps the best power per duration, per year and over all of them', () => {
    const {years, rows} = powerCurveByYear([
      ride(1, '2025-05-01T08:00:00Z', {power_curve: {5: 900, 300: 300}}),
      ride(2, '2026-05-01T08:00:00Z', {power_curve: {5: 800, 300: 320, 1200: 280}}),
      ride(3, '2026-06-01T08:00:00Z', {power_curve: null}),
    ]);

    expect(years).toEqual([2026, 2025]);
    expect(rows.find(({duration}) => '5 s' === duration)).toMatchObject({2025: 900, 2026: 800, all: 900});
    expect(rows.find(({duration}) => '5 min' === duration)).toMatchObject({2025: 300, 2026: 320, all: 320});
    expect(rows.find(({duration}) => '20 min' === duration)).toMatchObject({2025: null, 2026: 280, all: 280});
  });
});

describe('aerobic efficiency', () => {
  it('divides normalized power by average heart rate, rides with both only', () => {
    const points = aerobicEfficiency([
      ride(2, '2026-02-01T08:00:00Z', {normalized_power: 210, average_heartrate: 140}),
      ride(1, '2026-01-01T08:00:00Z', {normalized_power: 200, average_heartrate: 150}),
      ride(3, '2026-03-01T08:00:00Z', {normalized_power: 200, average_heartrate: undefined}),
    ]);

    expect(points.map(({id, efficiency}) => [id, efficiency])).toEqual([
      [1, 1.33],
      [2, 1.5],
    ]);
  });
});

describe('zones per week', () => {
  it('puts the seconds of each power band into the zone of the FTP of the day', () => {
    const now = new Date('2026-10-14T12:00:00');
    // 0 to 25 W, 125 to 150 W (Z2 at 250 W FTP) and 250 to 275 W (Z5).
    const histogram = [600, 0, 0, 0, 0, 3600, 0, 0, 0, 0, 1800];
    const rows = zonesPerWeek([ride(1, '2026-10-13T08:00:00Z', {power_histogram: histogram})], () => 250, 2, now);

    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({week: expect.any(String), z1: 600 / 3600, z2: 1, z5: 0.5});
    expect(rows[0]).toMatchObject({z1: 0, z2: 0});
  });
});

describe('heart rate drift', () => {
  it('lists the long rides that have one, oldest first', () => {
    const rides = driftByRide([
      ride(2, '2026-02-01T08:00:00Z', {heart_rate_drift: 3.5}),
      ride(1, '2026-01-01T08:00:00Z', {heart_rate_drift: -1}),
      ride(3, '2026-03-01T08:00:00Z', {heart_rate_drift: null}),
    ]);

    expect(rides.map(({id, drift}) => [id, drift])).toEqual([
      [1, -1],
      [2, 3.5],
    ]);
  });
});

describe('run best times', () => {
  it('finds the fastest time over each distance, per year and of all', () => {
    const run = (id: number, date: string, fiveK: number) =>
      buildDetailedActivity({id, sport_type: ActivityType.Run, start_date: date, start_date_local: date, ...{best_efforts: [{name: '5K', elapsed_time: fiveK}]}});
    const {years, rows} = runBestTimes([run(1, '2025-04-01T08:00:00Z', 1500), run(2, '2026-04-01T08:00:00Z', 1550), run(3, '2026-05-01T08:00:00Z', 1520)]);

    expect(years).toEqual([2026, 2025]);
    expect(rows).toEqual([
      {distance: '5K', byYear: {2025: {seconds: 1500, id: 1}, 2026: {seconds: 1520, id: 3}}, best: {seconds: 1500, id: 1, year: 2025}},
    ]);
  });
});

describe('commute routes', () => {
  it('groups commutes by name and keeps routes ridden a few times', () => {
    const commute = (id: number, name: string, speed: number) =>
      buildActivity({id, name, commute: true, distance: 8000, moving_time: 1200, average_speed: speed, start_date: `2026-01-0${id}T08:00:00Z`});
    const routes = commuteRoutes([commute(1, 'Home 🏠', 6), commute(2, 'Home 🏠 ', 7), commute(3, 'Home 🏠', 6.5), commute(4, 'Work 🧱', 6)]);

    expect(routes).toHaveLength(1);
    expect(routes[0]).toMatchObject({name: 'Home 🏠', count: 3, distance: 24000, bestSpeed: 7, bestId: 2, medianSpeed: 6.5, lastSpeed: 6.5});
  });
});
