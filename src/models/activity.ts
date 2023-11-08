import {IconType} from 'react-icons';
import {GiPathDistance, GiSkier} from 'react-icons/gi';
import {PiBicycle, PiBicycleFill, PiPinwheel, PiHeartbeatBold, PiGameControllerBold} from 'react-icons/pi';
import {TbKayak} from 'react-icons/tb';
import {FiZap} from 'react-icons/fi';
import {MdOutlineShowChart, MdOutlineTimer, MdOutlineSpeed, MdOutlineRocketLaunch} from 'react-icons/md';
import {ActivityType, DetailedActivity} from './strava';

const DEFAULT_INCLUDED_ACTIVITY_TYPES: ActivityType[] = [
  ActivityType.Ride,
  ActivityType.GravelRide,
  ActivityType.VirtualRide,
];

const ACTIVITY_URL = 'https://www.strava.com/activities/';

const SORT_TYPES = {
  date: {
    value: 'date',
    label: '📅',
  },
  // name: {
  //   value: 'name',
  //   label: '🔤',
  // },
  distance: {
    value: 'distance',
    label: '🗺️',
  },
  elevation: {
    value: 'elevation',
    label: '⛰️',
  },
  duration: {
    value: 'duration',
    label: '⏱️',
  },
  average_speed: {
    value: 'average_speed',
    label: '💯',
  },
  max_speed: {
    value: 'max_speed',
    label: '🚀',
  },
  average_watts: {
    value: 'average_watts',
    label: '⚡️',
  },
  average_cadence: {
    value: 'average_cadence',
    label: '🎡',
  },
  average_heartrate: {
    value: 'average_heartrate',
    label: '🫀',
  },
};

const GEARS: {[id: string]: {label: string; value: string}} = {
  b12655849: {
    value: 'b12655849',
    label: '🐈‍⬛',
  },
  b11897955: {
    value: 'b11897955',
    label: '🦖',
  },
  b3121762: {
    value: 'b3121762',
    label: '🐝',
  },
  b2391730: {
    value: 'b2391730',
    label: '🦎',
  },
  b2417181: {
    value: 'b2417181',
    label: '🫐',
  },
  b13424500: {
    value: 'b13424500',
    label: '🤖',
  },
  null: {value: 'null', label: '🤷'},
};

type ActivityTag = {
  label: (activity: DetailedActivity) => string;
  icon: IconType;
  sortType: SortType;
};

const TAGS: ActivityTag[] = [
  {
    label: activity => formatDistance(activity.distance, 0),
    icon: GiPathDistance,
    sortType: 'distance',
  },
  {
    label: activity => formatElevation(activity.total_elevation_gain),
    icon: MdOutlineShowChart,
    sortType: 'elevation',
  },
  {
    label: activity => formatDuration(activity.moving_time),
    icon: MdOutlineTimer,
    sortType: 'duration',
  },
  {
    label: activity => formatSpeed(activity.average_speed),
    icon: MdOutlineSpeed,
    sortType: 'average_speed',
  },
  {
    label: activity => formatSpeed(activity.max_speed),
    icon: MdOutlineRocketLaunch,
    sortType: 'max_speed',
  },
  {
    label: activity => `${activity.average_watts?.toFixed(0) ?? 0} W`,
    icon: FiZap,
    sortType: 'average_watts',
  },
  {
    label: activity => `${activity.average_cadence?.toFixed(0) ?? 0} rpm`,
    icon: PiPinwheel,
    sortType: 'average_cadence',
  },
  {
    label: activity => `${activity.average_heartrate?.toFixed(0) ?? 0} bpm`,
    icon: PiHeartbeatBold,
    sortType: 'average_heartrate',
  },
];

const YEARS = [2015, 2016, 2017, 2018, 2023, 2024];

type SortType = keyof typeof SORT_TYPES;

type SortDirection = 'asc' | 'desc';

type ActivityFilter = {
  search?: string;
  sort?: SortType;
  sortDirection?: SortDirection;
  includedActivityTypes?: ActivityType[];
  gearId?: string;
  years?: number[];
  withCommute: boolean;
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
    case ActivityType.VirtualRide:
      return PiGameControllerBold;
    case ActivityType.Ride:
    default:
      return PiBicycle;
  }
};

const sortActivities = (
  sortType: SortType,
  sortDirection: SortDirection,
  a: DetailedActivity,
  b: DetailedActivity
): number => {
  const [first, second] = 'desc' === sortDirection ? [a, b] : [b, a];

  switch (sortType) {
    // case 'name':
    //   return first.name < second.name ? 1 : -1;
    case 'elevation':
      return second.total_elevation_gain - first.total_elevation_gain;
    case 'distance':
      return second.distance - first.distance;
    case 'date':
      return first.start_date < second.start_date ? 1 : -1;
    case 'duration':
      return second.moving_time - first.moving_time;
    case 'average_speed':
      return second.average_speed - first.average_speed;
    case 'max_speed':
      return second.max_speed - first.max_speed;
    case 'average_watts':
      return second.average_watts - first.average_watts;
    case 'average_cadence':
      return (second.average_cadence ?? 0) - (first.average_cadence ?? 0);
    case 'average_heartrate':
      return (second.average_heartrate ?? 0) - (first.average_heartrate ?? 0);
  }
};

const formatDistance = (distance: number, precision = 1): string => `${(distance / 1000).toFixed(precision)} km`;
const formatElevation = (elevation: number): string => `${elevation.toFixed(0)} m`;
const formatSpeed = (speed: number): string => `${(speed * 3.6).toFixed(1)} km/h`;

const formatDuration = (durationInSeconds: number): string => {
  const hours = durationInSeconds / 60 / 60;
  const roundHours = Math.floor(hours);
  const minutes = (hours - roundHours) * 60;
  const roundMinutes = Math.round(minutes);

  return `${roundHours}:${roundMinutes.toString().padStart(2, '0')} h`;
};

const formatDurationInDays = (durationInSeconds: number): string => {
  const hourCount = durationInSeconds / 60 / 60 / 24;
  const hoursRemaining = (hourCount % 24) - Math.floor(hourCount);
  const suffix = 0.75 <= hoursRemaining ? '¾' : 0.5 <= hoursRemaining ? '½' : 0.25 <= hoursRemaining ? '¼' : '';

  return `${Math.floor(hourCount)}${suffix} days`;
};

const getTotalValue = (activities: DetailedActivity[], value: keyof DetailedActivity): number =>
  activities.reduce((total, activity) => {
    if (typeof activity[value] !== 'number') {
      return 0;
    }

    return (activity[value] as number) + total;
  }, 0);

const getMaxValue = (activities: DetailedActivity[], value: keyof DetailedActivity): number =>
  Math.max(...activities.map(activity => activity[value] as number));

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

  return eddingtonNumber;
};

export {
  ACTIVITY_URL,
  DEFAULT_INCLUDED_ACTIVITY_TYPES,
  GEARS,
  SORT_TYPES,
  TAGS,
  YEARS,
  eddingtonNumber,
  formatDistance,
  formatDuration,
  formatDurationInDays,
  formatElevation,
  formatSpeed,
  getActivityIcon,
  getMaxValue,
  getTotalValue,
  sortActivities,
};
export type {SortType, ActivityFilter, SortDirection};
