import {GiDutchBike, GiSkier} from 'react-icons/gi';
import {MdDirectionsBike} from 'react-icons/md';
import {TbKayak} from 'react-icons/tb';
import {ActivityType} from './strava';

const sortTypes = {
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
};

type SortType = keyof typeof sortTypes;

const getActivityTypeIcon = (activityType: ActivityType) => {
  switch (activityType) {
    case ActivityType.AlpineSki:
      return GiSkier;
    case ActivityType.GravelRide:
      return GiDutchBike;
    case ActivityType.Kayaking:
      return TbKayak;
    case ActivityType.Ride:
    default:
      return MdDirectionsBike;
  }
};

const formatDistance = (distance: number): string => `${Math.round(distance / 1000)} km`;
const formatElevation = (elevation: number): string => `${Math.round(elevation)} m`;
const formatDuration = (duration: number): string => `${new Date(duration * 1000).toISOString().substring(11, 16)} h`;
const formatSpeed = (speed: number): string => `${(speed * 3.6).toFixed(1)} km/h`;

export {formatDistance, formatElevation, sortTypes, getActivityTypeIcon, formatDuration, formatSpeed};
export type {SortType};
