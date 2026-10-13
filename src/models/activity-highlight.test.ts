import {buildActivity} from '../../test/test-util';
import {activityHighlight, gradesByYear, terrainOf} from './activity-highlight';
import {ActivityType} from './strava';

test('a race stands out first, whatever its length', () => {
  expect(activityHighlight(buildActivity({type: ActivityType.Ride, workout_type: 11, distance: 140000}))).toBe('race');
  expect(activityHighlight(buildActivity({type: ActivityType.Run, workout_type: 1, distance: 10000}))).toBe('race');
});

test('a day of 100 km or more stands out', () => {
  expect(activityHighlight(buildActivity({type: ActivityType.Ride, workout_type: 10, distance: 100000}))).toBe('long');
});

test('anything else does not', () => {
  expect(activityHighlight(buildActivity({type: ActivityType.Ride, workout_type: 10, distance: 99000}))).toBeNull();
  expect(activityHighlight(buildActivity({type: ActivityType.Ride, workout_type: 12, distance: 40000}))).toBeNull();
});

test('without enough history, a ride is graded by the metres it climbs per km', () => {
  const ride = (climbing: number) => buildActivity({distance: 100000, total_elevation_gain: climbing});

  expect(terrainOf(ride(300))).toMatchObject({percent: 0.3, terrain: {name: 'Flat'}, steeperThan: null});
  expect(terrainOf(ride(500))?.terrain.name).toBe('Rolling');
  expect(terrainOf(ride(1200))?.terrain.name).toBe('Hilly');
  expect(terrainOf(ride(1800))?.terrain.name).toBe('Very hilly');
  expect(terrainOf(ride(2400))?.terrain.name).toBe('Mountainous');
  expect(terrainOf(buildActivity({distance: 0, total_elevation_gain: 0}))).toBeNull();
});

test("with enough history, a ride is graded against the rider's own rides", () => {
  // A hundred rides from 0.1% to 1% climbing, and short ones that do not count.
  const history = [
    ...Array.from({length: 100}, (_, index) => buildActivity({id: index + 1, distance: 50000, total_elevation_gain: 50 + index * 5})),
    buildActivity({id: 500, distance: 2000, total_elevation_gain: 200}),
  ];
  const ride = (climbing: number) => buildActivity({id: 999, distance: 50000, total_elevation_gain: climbing});

  expect(terrainOf(ride(60), history)).toMatchObject({terrain: {name: 'Flat'}, steeperThan: 0.02});
  expect(terrainOf(ride(300), history)?.terrain.name).toBe('Hilly');
  expect(terrainOf(ride(500), history)?.terrain.name).toBe('Very hilly');
  expect(terrainOf(ride(600), history)).toMatchObject({terrain: {name: 'Mountainous'}, steeperThan: 1});
});

test('grades spread over the years as each ride is graded against all of them', () => {
  const rides = Array.from({length: 100}, (_, index) =>
    buildActivity({id: index + 1, distance: 50000, total_elevation_gain: 50 + index * 5, start_date_local: `${2025 + (index % 2)}-05-01T08:00:00Z`}),
  );
  const years = gradesByYear(rides);

  expect(years.map(({year, total}) => [year, total])).toEqual([
    [2025, 50],
    [2026, 50],
  ]);
  // The same ranking as one ride at a time.
  const steepest = rides[rides.length - 1];
  expect(terrainOf(steepest, rides)?.terrain.name).toBe('Mountainous');
  expect(years[0].counts.Mountainous + years[1].counts.Mountainous).toBe(5);
  expect(Object.values(years[0].counts).reduce((sum, count) => sum + count, 0)).toBe(50);
});
