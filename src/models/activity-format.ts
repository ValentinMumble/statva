import {formatSpeed, formatCalories} from './util';
import {ActivityType, Activity} from './strava';

const getActivityUrl = ({id}: Activity): string => `https://www.strava.com/activities/${id}`;

const getHeartZone = ({average_heartrate = 0}: Activity): number => {
  switch (true) {
    case average_heartrate === 0:
      break;
    case average_heartrate < 117:
      return 1;
    case average_heartrate < 143:
      return 2;
    case average_heartrate < 162:
      return 3;
    case average_heartrate < 181:
      return 4;
    case average_heartrate >= 181:
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
    case ActivityType.Hike:
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

export {
  calculateRunCalories,
  calculateSwimCalories,
  formatLaps,
  formatPaceOrSpeed,
  getActivityUrl,
  getHeartZone,
  getPowerZone,
  guessCalories,
};
