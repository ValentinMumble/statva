import {GiSkier} from 'react-icons/gi';
import {PiBicycle, PiBicycleFill, PiGameControllerBold, PiQuestionBold, PiTennisBallBold} from 'react-icons/pi';
import {TbKayak} from 'react-icons/tb';
import {SortType, SortDirection} from '../models';
import {ActivityType, DetailedActivity} from './strava';

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
    case ActivityType.Kayaking:
      return TbKayak;
    case ActivityType.Ride:
      return PiBicycle;
    case ActivityType.Tennis:
      return PiTennisBallBold;
    case ActivityType.VirtualRide:
      return PiGameControllerBold;
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

export {eddingtonNumber, getRidesBeforeMonth, getActivityIcon, getMaxValue, getTotalValue};
export type {ActivityFilter};
