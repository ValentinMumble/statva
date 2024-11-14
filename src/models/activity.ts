import {SortType, SortDirection, formatSpeed} from '../models';
import {ActivityType, Activity} from './strava';

type ActivityFilter = {
  search?: string;
  sort?: SortType;
  sortDirection?: SortDirection;
  includedActivityTypes?: ActivityType[];
  gearId?: string;
  years?: number[];
  withCommute?: boolean;
  withPrivate: boolean;
  minTime?: number;
};

const getTypes = (type: ActivityType | string): ActivityType[] => {
  switch (type) {
    case ActivityType.Ride:
      return [ActivityType.Ride, ActivityType.GravelRide, ActivityType.VirtualRide];
    default:
      return [type as ActivityType];
  }
};

const getTotalValue = (activities: Activity[], value: keyof Activity): number =>
  activities.reduce((total, activity) => {
    if (typeof activity[value] !== 'number') {
      return 0;
    }

    return (activity[value] as number) + total;
  }, 0);

const getMaxValue = (activities: Activity[], value: keyof Activity): number =>
  Math.max(...activities.map(activity => (activity[value] ?? 0) as number));

const getAverageValue = (activities: Activity[], value: keyof Activity): number =>
  activities
    .filter(activity => undefined !== activity[value])
    .reduce((total, activity, _index, activities) => total + (activity[value] as number) / activities.length, 0);

const getRidesBeforeMonth = (rides: Activity[], date: Date) =>
  rides.filter(ride => new Date(ride.start_date) < new Date(date.getFullYear(), date.getMonth() + 1, 0));

const getRidesBetween = (rides: Activity[], from: Date, to: Date | null) =>
  rides.filter(ride => new Date(ride.start_date) >= from && new Date(ride.start_date) < (to ?? new Date()));

const eddingtonNumber = (rides: Activity[]) => {
  const ridesPerDay = rides.reduce((dayMap: {[dateString: string]: number}, activity) => {
    const dateString = new Date(activity.start_date).toDateString();
    dayMap[dateString] = (dayMap[dateString] ?? 0) + activity.distance;

    return dayMap;
  }, {});

  const rideCount = Object.values(ridesPerDay).length;
  const rideCountPerDistance: number[] = new Array(rideCount).fill(0);
  let eddingtonNumber = 0;
  let above = 0;

  Object.values(ridesPerDay).forEach(distance => {
    const distanceInKm = Math.round(distance / 1000);

    if (distanceInKm > eddingtonNumber) {
      above++;

      if (distanceInKm < rideCount) {
        rideCountPerDistance[distanceInKm]++;
      }

      if (above > eddingtonNumber) {
        eddingtonNumber++;
        above -= rideCountPerDistance[eddingtonNumber];
      }
    }
  });

  const next = eddingtonNumber - above + 1;

  return [eddingtonNumber, next];
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
    if (activity.name.toLowerCase().includes(key)) {
      return value;
    }

    return distance;
  }, -1);

  return `${-1 === poolLength ? '?' : Math.round(activity.distance / poolLength)} laps`;
};

export {
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
};
export type {ActivityFilter};
