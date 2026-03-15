import {SortType, SortDirection} from '../models';
import {ActivityType, Activity, WorkoutType} from './strava';

type ActivityFilter = {
  search?: string;
  sort?: SortType;
  sortDirection?: SortDirection;
  includedActivityTypes?: ActivityType[];
  gearId?: string;
  years?: number[];
  withCommute?: boolean | 'only';
  withPrivate: boolean;
  minTime?: number;
};

const getTypes = (...types: (ActivityType | string)[]): ActivityType[] => [
  ...new Set(
    types.reduce((types: ActivityType[], type) => {
      switch (type) {
        case ActivityType.Ride:
          return [...types, ActivityType.Ride, ActivityType.GravelRide, ActivityType.VirtualRide];
        case ActivityType.Run:
          return [...types, ActivityType.Run, ActivityType.TrailRun];
        default:
          return [...types, type as ActivityType];
      }
    }, [])
  ),
];

const WORKOUT_TYPE_MAP: Record<string, Record<number, WorkoutType>> = {
  Ride: {
    10: WorkoutType.None,
    11: WorkoutType.Race,
    12: WorkoutType.Workout,
  },
  Run: {
    0: WorkoutType.None,
    1: WorkoutType.Race,
    2: WorkoutType.LongRun,
    3: WorkoutType.Workout,
  },
};

const getWorkoutType = (activity: Activity): WorkoutType =>
  WORKOUT_TYPE_MAP[activity.type]?.[activity.workout_type] ?? WorkoutType.None;

export {getTypes, getWorkoutType};
export type {ActivityFilter};
