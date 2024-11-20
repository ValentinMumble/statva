import {buildActivity} from '../../test/test-util';
import {getTypes, getWorkoutType} from './activity';
import {ActivityType, WorkoutType} from './strava';

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
