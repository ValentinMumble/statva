import {getTypes} from './activity';
import {ActivityType} from './strava';

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
