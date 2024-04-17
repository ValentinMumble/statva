import {GiSkier} from 'react-icons/gi';
import {PiBicycle, PiBicycleFill, PiGameControllerBold, PiQuestionBold, PiTennisBallBold} from 'react-icons/pi';
import {TbKayak, TbRun} from 'react-icons/tb';
import {MdDirectionsWalk, MdHiking} from 'react-icons/md';
import {SortType, SortDirection} from '../models';
import {ActivityType, DetailedActivity} from './strava';

const ACTIVITY_URL = 'https://www.strava.com/activities/';

type ActivityFilter = {
  search?: string;
  sort?: SortType;
  sortDirection?: SortDirection;
  includedActivityTypes?: ActivityType[];
  gearId?: string;
  years?: number[];
  withCommute?: boolean;
  withPrivate: boolean;
};

const getActivityIcon = (activity: DetailedActivity) => {
  switch (activity.sport_type) {
    case ActivityType.AlpineSki:
      return GiSkier;
    case ActivityType.GravelRide:
      return PiBicycleFill;
    case ActivityType.Hike:
      return MdHiking;
    case ActivityType.Kayaking:
      return TbKayak;
    case ActivityType.Ride:
      return PiBicycle;
    case ActivityType.Run:
      return TbRun;
    case ActivityType.Tennis:
      return PiTennisBallBold;
    case ActivityType.VirtualRide:
      return PiGameControllerBold;
    case ActivityType.Walk:
      return MdDirectionsWalk;
    default:
      return PiQuestionBold;
  }
};

const getTotalValue = (activities: DetailedActivity[], value: keyof DetailedActivity): number =>
  activities.reduce((total, activity) => {
    if (typeof activity[value] !== 'number') {
      return 0;
    }

    return (activity[value] as number) + total;
  }, 0);

const getMaxValue = (activities: DetailedActivity[], value: keyof DetailedActivity): number =>
  Math.max(...activities.map(activity => (activity[value] ?? 0) as number));

const getRidesBeforeMonth = (rides: DetailedActivity[], date: Date) =>
  rides.filter(ride => new Date(ride.start_date) < new Date(date.getFullYear(), date.getMonth() + 1, 0));

const eddingtonNumber = (rides: DetailedActivity[]) => {
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

const getActivityUrl = ({id}: DetailedActivity): string => `${ACTIVITY_URL}${id}`;

const getHeartZone = ({average_heartrate = 0}: DetailedActivity, maxHeartrate = 190): number => {
  switch (true) {
    case average_heartrate === 0:
      break;
    case average_heartrate < 0.59 * maxHeartrate:
      return 1;
    case average_heartrate < 0.8 * maxHeartrate: // 0.78
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

const getPowerZone = ({average_watts = 0}: DetailedActivity, ftp: number): number => {
  switch (true) {
    case average_watts === 0:
      break;
    case average_watts < 0.55 * ftp:
      return 1;
    case average_watts < 0.75 * ftp:
      return 2;
    case average_watts < 0.9 * ftp:
      return 3;
    case average_watts < 1.05 * ftp:
      return 4;
    case average_watts < 1.2 * ftp:
      return 5;
    case average_watts < 1.5 * ftp:
      return 6;
    case average_watts >= 1.5 * ftp:
      return 7;
  }

  return 0;
};

export {
  eddingtonNumber,
  getActivityUrl,
  getRidesBeforeMonth,
  getActivityIcon,
  getHeartZone,
  getMaxValue,
  getPowerZone,
  getTotalValue,
};
export type {ActivityFilter};
