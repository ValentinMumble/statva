import {GiDutchBike, GiSkier} from 'react-icons/gi';
import {LiaBicycleSolid} from 'react-icons/lia';
import {TbKayak} from 'react-icons/tb';
import {MdOutlineLock} from 'react-icons/md';
import {ActivityType, DetailedActivity} from './strava';

const ACTIVITY_URL = 'https://www.strava.com/activities/';

const SORT_TYPES = {
  name: {
    value: 'name',
    label: '🔤',
  },
  date: {
    value: 'date',
    label: '📆',
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
};

type SortType = keyof typeof SORT_TYPES;

const getActivityIcon = (activity: DetailedActivity) => {
  if (activity.private) {
    return MdOutlineLock;
  }

  switch (activity.sport_type) {
    case ActivityType.AlpineSki:
      return GiSkier;
    case ActivityType.GravelRide:
      return GiDutchBike;
    case ActivityType.Kayaking:
      return TbKayak;
    case ActivityType.Ride:
    default:
      return LiaBicycleSolid;
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
  SORT_TYPES,
  formatDistance,
  formatDuration,
  formatElevation,
  formatSpeed,
  getActivityIcon,
  getMaxValue,
  getTotalValue,
};
export type {SortType};
