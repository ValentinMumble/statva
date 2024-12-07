import {buildActivity} from '../../test/test-util';
import {
  eddingtonNumber,
  formatLaps,
  getRidesBetween,
  getTypes,
  getWorkoutType,
  daysExceedingDistance,
} from './activity';
import {ActivityType, WorkoutType} from './strava';

describe('getTypes', () => {
  test('it can get matching types from an ActivityType', () => {
    expect(getTypes(ActivityType.Ride)).toEqual([ActivityType.Ride, ActivityType.GravelRide, ActivityType.VirtualRide]);
    expect(getTypes(ActivityType.Run)).toEqual([ActivityType.Run]);
  });

  test('it can get matching types from a string', () => {
    expect(getTypes('Ride')).toEqual([ActivityType.Ride, ActivityType.GravelRide, ActivityType.VirtualRide]);
    expect(getTypes('Swim')).toEqual([ActivityType.Swim]);
  });

  test('it can get matching types from multiple types', () => {
    expect(getTypes('Swim', 'Run')).toEqual([ActivityType.Swim, ActivityType.Run]);
    expect(getTypes('Swim', ActivityType.Run, 'Swim')).toEqual([ActivityType.Swim, ActivityType.Run]);
    expect(getTypes(...['Swim', ActivityType.Run, 'Swim'])).toEqual([ActivityType.Swim, ActivityType.Run]);
  });
});

describe('getWorkoutTypes', () => {
  test('it can get the workout type for a Ride', () => {
    expect(getWorkoutType(buildActivity({type: ActivityType.Ride, workout_type: 10}))).toEqual(WorkoutType.None);
    expect(getWorkoutType(buildActivity({type: ActivityType.Ride, workout_type: 11}))).toEqual(WorkoutType.Race);
    expect(getWorkoutType(buildActivity({type: ActivityType.Ride, workout_type: 12}))).toEqual(WorkoutType.Workout);
  });

  test('it can get the workout type for a Run', () => {
    expect(getWorkoutType(buildActivity({type: ActivityType.Run, workout_type: 0}))).toEqual(WorkoutType.None);
    expect(getWorkoutType(buildActivity({type: ActivityType.Run, workout_type: 1}))).toEqual(WorkoutType.Race);
    expect(getWorkoutType(buildActivity({type: ActivityType.Run, workout_type: 2}))).toEqual(WorkoutType.LongRun);
    expect(getWorkoutType(buildActivity({type: ActivityType.Run, workout_type: 3}))).toEqual(WorkoutType.Workout);
  });

  test('it returns None for an unknown sport type', () => {
    expect(getWorkoutType(buildActivity({type: ActivityType.Swim, workout_type: 0}))).toEqual(WorkoutType.None);
  });
});

describe('formatting', () => {
  test('it can format laps for a Swim activity', () => {
    expect(formatLaps(buildActivity({distance: 250, name: 'Natation Petit Port'}))).toEqual('10 laps');
    expect(formatLaps(buildActivity({distance: 250, name: 'Natation Léo Lagrange'}))).toEqual('5 laps');
    expect(formatLaps(buildActivity({distance: 250, name: 'Natation Dervallières'}))).toEqual('10 laps');
    expect(formatLaps(buildActivity({distance: 250, name: 'Natation unknown'}))).toEqual('? laps');
  });
});

describe('eddington', () => {
  test('it can compute eddington number and how many ride above 0 are needed for next level', () => {
    expect(eddingtonNumber([])).toEqual([0, 1]);
  });

  test('it can compute eddington number and how many ride above 2 are needed for next level', () => {
    const rides = [
      buildActivity({start_date: '2021-10-01', distance: 2000}),
      buildActivity({start_date: '2021-10-02', distance: 2000}),
    ];

    expect(eddingtonNumber(rides)).toEqual([2, 3]);
  });

  test('it can compute eddington number and how many ride above 5 are needed for next level', () => {
    const rides = [
      buildActivity({start_date: '2021-10-01', distance: 6000}),
      buildActivity({start_date: '2021-10-02', distance: 6000}),
      buildActivity({start_date: '2021-10-03', distance: 5000}),
      buildActivity({start_date: '2021-10-04', distance: 5000}),
      buildActivity({start_date: '2021-10-05', distance: 5000}),
    ];

    expect(eddingtonNumber(rides)).toEqual([5, 4]);
  });

  test('it can compute eddington number by day', () => {
    const rides = [
      buildActivity({start_date: '2021-10-01', distance: 2000}),
      buildActivity({start_date: '2021-10-01', distance: 2000}),
      buildActivity({start_date: '2021-10-02', distance: 4000}),
      buildActivity({start_date: '2021-10-03', distance: 4000}),
      buildActivity({start_date: '2021-10-04', distance: 4000}),
    ];

    expect(eddingtonNumber(rides)).toEqual([4, 5]);
  });
});

describe('getRidesBetween', () => {
  test('it can filter rides that happened only between the 2 given dates (from included, to excluded', () => {
    const rides = [
      buildActivity({start_date: '2021-10-01'}),
      buildActivity({start_date: '2021-10-02'}),
      buildActivity({start_date: '2021-10-03'}),
      buildActivity({start_date: '2021-10-04'}),
    ];

    expect(getRidesBetween(rides, new Date('2021-10-02'), new Date('2021-10-04'))).toEqual([
      buildActivity({start_date: '2021-10-02'}),
      buildActivity({start_date: '2021-10-03'}),
    ]);
  });

  test('it can filter rides that happened only between a from date and today (excluded) if no to provided', () => {
    const rides = [
      buildActivity({start_date: '2021-10-01'}),
      buildActivity({start_date: '2021-10-02'}),
      buildActivity({start_date: '2021-10-03'}),
      buildActivity({start_date: '2021-10-04'}),
    ];

    expect(getRidesBetween(rides, new Date('2021-10-02'))).toEqual([
      buildActivity({start_date: '2021-10-02'}),
      buildActivity({start_date: '2021-10-03'}),
      buildActivity({start_date: '2021-10-04'}),
    ]);
  });
});

describe('daysExceedingDistance', () => {
  test('it can get the count of days by distance', () => {
    const rides = [
      buildActivity({start_date: '2021-10-01', distance: 6000}),
      buildActivity({start_date: '2021-10-02', distance: 6000}),
      buildActivity({start_date: '2021-10-03', distance: 5000}),
      buildActivity({start_date: '2021-10-04', distance: 4000}),
      buildActivity({start_date: '2021-10-05', distance: 5000}),
    ];

    expect(daysExceedingDistance(rides)).toEqual({
      1: 5,
      2: 5,
      3: 5,
      4: 5,
      5: 4,
      6: 2,
    });
  });

  test('it can get the count of days by distance', () => {
    const rides = [
      buildActivity({start_date: '2021-10-01', distance: 6000}),
      buildActivity({start_date: '2021-10-01', distance: 1000}),
      buildActivity({start_date: '2021-10-02', distance: 3000}),
      buildActivity({start_date: '2021-10-04', distance: 4000}),
      buildActivity({start_date: '2021-10-05', distance: 5000}),
    ];

    expect(daysExceedingDistance(rides)).toEqual({
      1: 4,
      2: 4,
      3: 4,
      4: 3,
      5: 2,
      6: 1,
      7: 1,
    });
  });
});
