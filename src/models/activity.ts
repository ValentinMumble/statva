import {GiSkier} from 'react-icons/gi';
import {PiBicycle, PiBicycleFill} from 'react-icons/pi';
import {TbKayak} from 'react-icons/tb';
import {MdOutlineLock} from 'react-icons/md';
import {ActivityType, DetailedActivity} from './strava';

const DEFAULT_EXCLUDED_ACTIVITY_TYPES: ActivityType[] = [ActivityType.AlpineSki, ActivityType.Kayaking];

const ACTIVITY_URL = 'https://www.strava.com/activities/';

const SORT_TYPES = {
  name: {
    value: 'name',
    label: '🔤',
  },
  date: {
    value: 'date',
    label: '📅',
  },
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
  null: {value: 'null', label: '🤷'},
};

const YEARS = [2015, 2016, 2017, 2018, 2023, 2024];

type SortType = keyof typeof SORT_TYPES;

const getActivityIcon = (activity: DetailedActivity) => {
  if (activity.private) {
    return MdOutlineLock;
  }

  switch (activity.sport_type) {
    case ActivityType.AlpineSki:
      return GiSkier;
    case ActivityType.GravelRide:
      return PiBicycleFill;
    case ActivityType.Kayaking:
      return TbKayak;
    case ActivityType.Ride:
    default:
      return PiBicycle;
  }
};

const formatDistance = (distance: number, precision = 1): string => `${(distance / 1000).toFixed(precision)} km`;
const formatElevation = (elevation: number): string => `${elevation.toFixed(0)} m`;
const formatSpeed = (speed: number): string => `${(speed * 3.6).toFixed(1)} km/h`;

const formatDuration = (durationInSeconds: number): string => {
  const hours = durationInSeconds / (60 * 60);
  const roundHours = Math.floor(hours);
  const minutes = (hours - roundHours) * 60;
  const roundMinutes = Math.round(minutes);

  return `${roundHours}:${roundMinutes.toString().padStart(2, '0')} h`;
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

export {
  ACTIVITY_URL,
  DEFAULT_EXCLUDED_ACTIVITY_TYPES,
  GEARS,
  SORT_TYPES,
  YEARS,
  formatDistance,
  formatDuration,
  formatElevation,
  formatSpeed,
  getActivityIcon,
  getMaxValue,
  getTotalValue,
};
export type {SortType};
