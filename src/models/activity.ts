import {SortType, SortDirection, formatSpeed, formatCalories} from '../models';
import {ActivityType, Activity, WorkoutType, DetailedActivity} from './strava';

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

const WORKOUT_TYPE_MAP: {[key: string]: {[index: number]: WorkoutType}} = {
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

const getTotalValue = (activities: Activity[], value: keyof Activity): number =>
  activities.reduce((total, activity) => {
    if (typeof activity[value] !== 'number') {
      return 0;
    }

    return activity[value] + total;
  }, 0);

const getMaxValue = (activities: Activity[], value: keyof Activity): number =>
  Math.max(...activities.map(activity => Number(activity[value] ?? 0)));

const getAverageValue = (activities: Activity[], value: keyof Activity): number =>
  activities
    .filter(activity => undefined !== activity[value])
    .reduce((total, activity, _index, activities) => total + Number(activity[value]) / activities.length, 0);

const getRidesBeforeMonth = (rides: Activity[], date: Date) =>
  rides.filter(ride => new Date(ride.start_date) < new Date(date.getFullYear(), date.getMonth() + 1, 0));

const getRidesBetween = (rides: Activity[], from: Date, to?: Date | undefined): Activity[] =>
  rides.filter(ride => new Date(ride.start_date) >= from && new Date(ride.start_date) < (to ?? new Date()));

const eddingtonNumber = (rides: Activity[]) => {
  const dailyDistances = rides.reduce((dayMap: {[dateString: string]: number}, activity) => {
    const dateString = new Date(activity.start_date).toISOString().slice(0, 10);
    dayMap[dateString] = (dayMap[dateString] ?? 0) + activity.distance;

    return dayMap;
  }, {});

  const distancesKm = Object.values(dailyDistances)
    .map(distance => distance / 1000)
    .sort((a, b) => b - a);

  let eddingtonNumber = 0;

  for (let i = 0; i < distancesKm.length; i++) {
    if (distancesKm[i] >= i + 1) {
      eddingtonNumber = i + 1;
    } else {
      break;
    }
  }

  const daysForNextLevel = Math.max(
    0,
    eddingtonNumber + 1 - distancesKm.filter(distance => distance >= eddingtonNumber + 1).length
  );

  return [eddingtonNumber, daysForNextLevel];
};

const daysExceedingDistance = (rides: Activity[]): {[distance: number]: number} => {
  const dailyDistances = rides.reduce((dayMap: {[dateString: string]: number}, activity) => {
    const dateString = new Date(activity.start_date).toISOString().slice(0, 10);
    dayMap[dateString] = (dayMap[dateString] ?? 0) + activity.distance;

    return dayMap;
  }, {});

  const distancesKm = Object.values(dailyDistances).map(distance => distance / 1000);

  const result: {[distanceKm: number]: number} = {};
  for (let distance = 1; distance <= Math.max(...distancesKm); distance++) {
    result[distance] = 0;
  }

  distancesKm.forEach(distance => {
    for (let d = 1; d <= Math.floor(distance); d++) {
      result[d]++;
    }
  });

  return result;
};

const getActivityUrl = ({id}: Activity): string => `https://www.strava.com/activities/${id}`;

const getHeartZone = ({average_heartrate = 0}: Activity, maxHeartrate = 190): number => {
  switch (true) {
    case average_heartrate === 0:
      break;
    case average_heartrate < 0.59 * maxHeartrate:
      return 1;
    case average_heartrate < 0.78 * maxHeartrate:
      return 2;
    case average_heartrate < 0.87 * maxHeartrate:
      return 3;
    case average_heartrate < 0.97 * maxHeartrate:
      return 4;
    case average_heartrate >= 0.97 * maxHeartrate:
      return 5;
  }

  return 0;
};

const getPowerZone = (watts: number, ftp: number): number => {
  switch (true) {
    case watts === 0:
      break;
    case watts < 0.55 * ftp:
      return 1;
    case watts < 0.75 * ftp:
      return 2;
    case watts < 0.9 * ftp:
      return 3;
    case watts < 1.05 * ftp:
      return 4;
    case watts < 1.2 * ftp:
      return 5;
    case watts < 1.5 * ftp:
      return 6;
    case watts >= 1.5 * ftp:
      return 7;
  }

  return 0;
};

const formatPaceOrSpeed = (activity: Activity, precision?: number, elapsed?: boolean): string => {
  const time = elapsed ? activity.elapsed_time : activity.moving_time;

  switch (activity.sport_type) {
    case ActivityType.Run:
    case ActivityType.TrailRun:
      const secsPerKm = (time / activity.distance) * 1000;
      const minutesPerKm = Math.floor(secsPerKm / 60);
      const secondsPerKm = Math.round(secsPerKm - minutesPerKm * 60);

      return `${minutesPerKm}:${secondsPerKm.toString().padStart(2, '0')} /km`;
    case ActivityType.Swim:
      const secsPer100m = (time / activity.distance) * 100;
      const minutesPer100m = Math.floor(secsPer100m / 60);
      const secondsPer100m = Math.round(secsPer100m - minutesPer100m * 60);

      return `${minutesPer100m}:${secondsPer100m.toString().padStart(2, '0')} /100m`;
    default:
      return formatSpeed(activity.average_speed, precision);
  }
};

const POOL_LENGTH = {
  'petit port': 25,
  moustoir: 25,
  lagrange: 50,
  kirk: 15,
  dervallieres: 25,
};

const formatLaps = (activity: Activity): string => {
  const poolLength = Object.entries(POOL_LENGTH).reduce((distance, [key, value]) => {
    if (
      activity.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .includes(key)
    ) {
      return value;
    }

    return distance;
  }, -1);

  return `${-1 === poolLength ? '?' : Math.round(activity.distance / poolLength)} laps`;
};

const calculateRunCalories = (weight: number, movingTime: number, distance: number, avgHeartrate: number): number => {
  // Constants for Apple Fitness calculation
  const activeCaloriesPerMinuteBase = 0.12; // Base active calorie burn rate per minute per kg (example value)
  const activeHeartRateFactor = (avgHeartrate - 80) / 100; // Example adjustment factor for heart rate
  const caloriesPerKmPerKg = 1.0; // Approximate calorie burn per km per kg for running

  // Convert moving time to minutes
  const movingTimeMinutes = movingTime / 60;

  // Calculate calories based on time
  const timeBasedCalories = weight * movingTimeMinutes * activeCaloriesPerMinuteBase * (1 + activeHeartRateFactor);

  // Calculate calories based on distance
  const distanceBasedCalories = weight * (distance / 1000) * caloriesPerKmPerKg;

  // Combine the two estimates
  const totalCalories = (timeBasedCalories + distanceBasedCalories) / 2;

  return Math.round(totalCalories);
};

const calculateSwimCalories = (weight: number, time: number, distance: number, heartRate: number): number => {
  // Apple Fitness method factors
  const baseCaloriesPerMinute = 0.13 * weight; // Base calories burned per minute per kg for swimming
  const heartRateFactor = (heartRate - 100) * 0.08; // Adjust for heart rate intensity
  const distanceFactor = (distance / 1000) * 0.25; // Adjust for distance in kilometers

  // Time in minutes
  const timeInMinutes = time / 60;

  // Calculate calories burned
  const calories = (baseCaloriesPerMinute + heartRateFactor + distanceFactor) * timeInMinutes;

  return Math.round(calories);
};

const guessCalories = (activity: Activity): string | null => {
  if (activity.kilojoules) {
    return formatCalories(activity.kilojoules);
  }

  switch (activity.sport_type) {
    case ActivityType.Swim:
      return formatCalories(
        calculateSwimCalories(74, activity.moving_time, activity.distance, activity.average_heartrate ?? 0)
      );
    case ActivityType.Run:
    case ActivityType.TrailRun:
      return formatCalories(
        calculateRunCalories(74, activity.moving_time, activity.distance, activity.average_heartrate ?? 0)
      );
    default:
      return null;
  }
};

const cleanActivity = (activity: DetailedActivity): DetailedActivity => {
  activity['segment_efforts'] = [];
  activity['splits_metric'] = [];
  activity['splits_standard'] = [];
  activity['laps'] = [];

  return activity;
};

const computeFinishCount = (rideMeta: DetailedActivity[]): Record<string, number> => {
  const locationCount: Record<string, number> = {};

  rideMeta.forEach(activity => {
    const match = activity.description.match(/Finish\s+([\w'’\s]+)/i);
    if (match) {
      const location = match[1].trim();
      if (locationCount[location]) {
        locationCount[location]++;
      } else {
        locationCount[location] = 1;
      }
    }
  });

  return locationCount;
};

export {
  calculateRunCalories,
  calculateSwimCalories,
  cleanActivity,
  computeFinishCount,
  eddingtonNumber,
  formatLaps,
  formatPaceOrSpeed,
  getActivityUrl,
  getAverageValue,
  getHeartZone,
  getMaxValue,
  getPowerZone,
  getRidesBeforeMonth,
  getRidesBetween,
  getTotalValue,
  getTypes,
  getWorkoutType,
  guessCalories,
  daysExceedingDistance,
};
export type {ActivityFilter};
