import {IconType} from 'react-icons';
import {FiZap} from 'react-icons/fi';
import {GiPathDistance} from 'react-icons/gi';
import {MdOutlineShowChart, MdOutlineTimer, MdOutlineSpeed, MdOutlineRocketLaunch} from 'react-icons/md';
import {PiPinwheel, PiHeartbeatBold} from 'react-icons/pi';
import {TbThumbUp} from 'react-icons/tb';
import {DetailedActivity, SortType, formatDistance, formatElevation, formatDuration, formatSpeed} from '../models';

type Tag = {
  label: (activity: DetailedActivity) => string;
  isRelevant: (activity: DetailedActivity) => boolean;
  icon: IconType;
  sortType: SortType;
};

const TAGS: Tag[] = [
  {
    label: activity => formatDistance(activity.distance, 0),
    isRelevant: activity => 0 < activity.distance,
    icon: GiPathDistance,
    sortType: 'distance',
  },
  {
    label: activity => formatElevation(activity.total_elevation_gain),
    isRelevant: activity => 0 < activity.total_elevation_gain,
    icon: MdOutlineShowChart,
    sortType: 'elevation',
  },
  {
    label: activity => formatDuration(activity.moving_time),
    isRelevant: activity => 0 < activity.moving_time,
    icon: MdOutlineTimer,
    sortType: 'duration',
  },
  {
    label: activity => formatSpeed(activity.average_speed),
    isRelevant: activity => 0 < activity.average_speed,
    icon: MdOutlineSpeed,
    sortType: 'average_speed',
  },
  {
    label: activity => formatSpeed(activity.max_speed),
    isRelevant: activity => 0 < activity.max_speed,
    icon: MdOutlineRocketLaunch,
    sortType: 'max_speed',
  },
  {
    label: activity => `${activity.average_watts?.toFixed(0) ?? 0} W`,
    isRelevant: activity => 0 < (activity.average_watts ?? 0),
    icon: FiZap,
    sortType: 'average_watts',
  },
  {
    label: activity => `${activity.average_cadence?.toFixed(0) ?? 0}`,
    isRelevant: activity => 0 < (activity.average_cadence ?? 0),
    icon: PiPinwheel,
    sortType: 'average_cadence',
  },
  {
    label: activity => `${activity.average_heartrate?.toFixed(0) ?? 0}`,
    isRelevant: activity => 0 < (activity.average_heartrate ?? 0),
    icon: PiHeartbeatBold,
    sortType: 'average_heartrate',
  },
  {
    label: activity => `${activity.kudos_count}`,
    isRelevant: activity => 0 < activity.kudos_count,
    icon: TbThumbUp,
    sortType: 'kudos_count',
  },
];

export {TAGS};
