import {buildDetailedActivity} from '../../test/test-util';
import {ActivityType} from './strava';
import {buildYearReview, countNewTiles} from './year-review';

const label = (key: string | null) => (null === key ? '🤷' : `[${key}]`);

const activity = (id: number, local: string, km: number, extra = {}) =>
  buildDetailedActivity({
    id,
    name: `Ride ${id}`,
    start_date: local,
    start_date_local: local,
    distance: km * 1000,
    moving_time: km * 120,
    kudos_count: 0,
    gear_id: null,
    sport_type: ActivityType.Ride,
    ...extra,
  });

const activities = [
  activity(1, '2025-12-30T09:00:00Z', 200),
  activity(2, '2026-01-04T09:00:00Z', 40, {name: 'Cold one 🥶🥶', gear_id: 'b1'}),
  activity(3, '2026-05-10T08:00:00Z', 90, {name: 'Sunny 🌞 loop 🥶', gear_id: 'b2', kudos_count: 12}),
  activity(4, '2026-05-10T17:00:00Z', 30, {name: 'Back home 🌞', gear_id: 'b1'}),
  activity(5, '2026-07-01T07:00:00Z', 60, {gear_id: 'b1', kudos_count: 3}),
  // a long run must not be the longest ride
  activity(6, '2026-08-15T07:00:00Z', 110, {sport_type: ActivityType.Run}),
];

describe('buildYearReview', () => {
  const review = buildYearReview(activities, 2026, label);

  it('totals the year only', () => {
    expect(review).toMatchObject({year: 2026, activities: 5, distance: 330000, movingTime: 330 * 120});
  });

  it('finds the biggest day, adding up every activity on it', () => {
    expect(review.biggestDay).toEqual({day: '2026-05-10', distance: 120000, count: 2});
  });

  it('finds the longest ride among rides', () => {
    expect(review.longestRide).toEqual({id: 3, name: 'Sunny 🌞 loop 🥶', day: '2026-05-10', value: 90000});
  });

  it('names the bike with the most kilometres', () => {
    expect(review.topBike).toEqual({name: '[b1]', distance: 130000, rides: 3});
  });

  it('finds the best month', () => {
    expect(review.bestMonth).toEqual({month: 5, distance: 120000});
  });

  it('counts each emoji once per name', () => {
    expect(review.emoji).toEqual([
      {emoji: '🥶', count: 2},
      {emoji: '🌞', count: 2},
    ]);
  });

  it('finds the most kudos and the first and last activity', () => {
    expect(review.mostKudos).toMatchObject({id: 3, value: 12});
    expect(review.first).toMatchObject({id: 2, day: '2026-01-04'});
    expect(review.last).toMatchObject({id: 6, day: '2026-08-15'});
  });

  it('stays empty for a year with nothing', () => {
    expect(buildYearReview(activities, 2020, label)).toEqual({
      year: 2020,
      activities: 0,
      distance: 0,
      movingTime: 0,
      biggestDay: null,
      longestRide: null,
      topBike: null,
      bestMonth: null,
      emoji: [],
      mostKudos: null,
      first: null,
      last: null,
    });
  });
});

describe('countNewTiles', () => {
  // Points a few hundredths of a degree apart land in different tiles at zoom 14.
  const NANTES = [47.23, -1.55];
  const PARIS = [48.85, 2.35];
  const ROME = [41.9, 12.5];

  it('counts only the tiles no earlier route had touched', () => {
    const routes = [
      {day: '2025-06-01', track: [NANTES]},
      {day: '2026-03-01', track: [NANTES]},
      {day: '2026-04-01', track: [PARIS]},
      {day: '2026-05-01', track: [ROME]},
      // later years do not take tiles away
      {day: '2027-01-01', track: [ROME]},
    ];

    expect(countNewTiles(routes, 2026)).toBe(2);
    expect(countNewTiles(routes, 2025)).toBe(1);
    expect(countNewTiles(routes, 2027)).toBe(0);
  });
});
