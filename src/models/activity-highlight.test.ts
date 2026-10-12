import {buildActivity} from '../../test/test-util';
import {activityHighlight} from './activity-highlight';
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
