import {getWorkoutType} from './activity';
import {Activity, WorkoutType} from './strava';

type Highlight = 'race' | 'long' | null;

// Where a ride turns into a big day out.
const LONG_DISTANCE = 100 * 1000;

/** What makes an activity stand out in a list: a race first, then a 100 km day. */
const activityHighlight = (activity: Activity): Highlight => {
  if (WorkoutType.Race === getWorkoutType(activity)) return 'race';
  if (activity.distance >= LONG_DISTANCE) return 'long';

  return null;
};

export {activityHighlight, LONG_DISTANCE};
export type {Highlight};
