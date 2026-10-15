import {buildDetailedActivity} from '../../test/test-util';
import {computeEddingtons, darkRides, eddingtonOf, sunTimes} from './eddingtons';
import {DetailedActivity} from './strava';

const NANTES = [47.218, -1.554];
const MINUTE_MS = 60_000;

let nextId = 1;
const ride = (start: string, fields: Partial<DetailedActivity> = {}): DetailedActivity =>
  buildDetailedActivity({
    id: nextId++,
    sport_type: 'Ride',
    trainer: false,
    start_date: start,
    start_date_local: start,
    start_latlng: NANTES,
    elapsed_time: 3600,
    moving_time: 3600,
    total_elevation_gain: 0,
    kudos_count: 0,
    athlete_count: 1,
    ...fields,
  } as never);

describe('eddingtonOf', () => {
  it('finds the biggest E with E values of at least E, and what the next one needs', () => {
    expect(eddingtonOf([5, 4, 3, 3, 1])).toEqual({number: 3, next: 4, have: 2, needed: 2});
    expect(eddingtonOf([])).toEqual({number: 0, next: 1, have: 0, needed: 1});
  });
});

describe('computeEddingtons', () => {
  it('counts climbing in 20 m steps and minutes by day, kudos and riders by activity', () => {
    const activities = [
      ride('2026-10-01T08:00:00Z', {total_elevation_gain: 70, moving_time: 7200, kudos_count: 3, athlete_count: 4}),
      // Same day: climbing and minutes add up.
      ride('2026-10-01T17:00:00Z', {total_elevation_gain: 30, moving_time: 1800, kudos_count: 5, athlete_count: 9}),
      ride('2026-10-02T08:00:00Z', {total_elevation_gain: 60, moving_time: 600, kudos_count: 2, athlete_count: 2}),
      {...ride('2026-10-03T08:00:00Z', {kudos_count: 8}), sport_type: 'Run'} as DetailedActivity,
    ];
    const eddingtons = computeEddingtons(activities);

    expect(eddingtons.climbing.number).toBe(2);
    expect(eddingtons.minutes.number).toBe(2);
    expect(eddingtons.kudos.number).toBe(3);
    expect(eddingtons.riders.number).toBe(2);
  });
});

describe('sunTimes', () => {
  it('matches the NOAA figures in Nantes, within a few minutes', () => {
    // 14 October 2026: sunrise 06:21 and sunset 17:22 UTC (08:21 and 19:22 local time).
    const sun = sunTimes(Date.parse('2026-10-14T12:00:00Z'), NANTES);

    expect(Math.abs((sun?.rise ?? 0) - Date.parse('2026-10-14T06:21:00Z'))).toBeLessThan(5 * MINUTE_MS);
    expect(Math.abs((sun?.set ?? 0) - Date.parse('2026-10-14T17:22:00Z'))).toBeLessThan(5 * MINUTE_MS);
  });

  it('has none in the polar night', () => {
    expect(sunTimes(Date.parse('2026-12-21T12:00:00Z'), [78.2, 15.6])).toBeNull();
  });
});

describe('darkRides', () => {
  it('counts outdoor rides started before sunrise or still out after sunset', () => {
    const activities = [
      ride('2026-10-14T17:30:00Z'),
      ride('2026-10-14T05:45:00Z'),
      ride('2026-10-14T12:00:00Z'),
      // Starts in daylight, ends after sunset.
      ride('2025-10-14T16:45:00Z', {elapsed_time: 3600}),
      ride('2026-10-14T20:00:00Z', {trainer: true}),
    ];
    const dark = darkRides(activities, 2026);

    expect(dark.count).toBe(3);
    expect(dark.thisYear).toBe(2);
    expect(dark.share).toBe(3 / 4);
    expect(dark.latest?.start_date).toBe('2026-10-14T17:30:00Z');
  });
});
