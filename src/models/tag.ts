import {IconType} from 'react-icons';
import {FiZap} from 'react-icons/fi';
import {GiPathDistance} from 'react-icons/gi';
import {MdOutlineShowChart, MdOutlineTimer, MdOutlineSpeed, MdOutlineRocketLaunch} from 'react-icons/md';
import {PiPinwheel, PiHeartbeatBold} from 'react-icons/pi';
import {TbPepper, TbThumbUp} from 'react-icons/tb';
import {SortType, formatDistance, formatElevation, formatDuration, formatSpeed} from '../models';
import {DetailedActivity} from './strava';

type Tag = {
  label: (activity: DetailedActivity) => string | number;
  isRelevant: (activity: DetailedActivity) => boolean;
  tooltip?: (activity: DetailedActivity) => string | null;
  icon: IconType;
  sortType: SortType;
};

const TAGS: Tag[] = [
  {
    label: ({distance}) => formatDistance(distance, 0),
    isRelevant: ({distance}) => 0 < distance,
    tooltip: ({distance}) => `🗺️ ${formatDistance(distance, 2)}`,
    icon: GiPathDistance,
    sortType: 'distance',
  },
  {
    label: ({total_elevation_gain}) => formatElevation(total_elevation_gain),
    isRelevant: ({total_elevation_gain}) => 0 < total_elevation_gain,
    icon: MdOutlineShowChart,
    sortType: 'elevation',
  },
  {
    label: ({moving_time}) => formatDuration(moving_time),
    isRelevant: ({moving_time}) => 0 < moving_time,
    tooltip: ({elapsed_time}) => `⏳ ${formatDuration(elapsed_time)}`,
    icon: MdOutlineTimer,
    sortType: 'duration',
  },
  {
    label: ({average_speed}) => formatSpeed(average_speed),
    isRelevant: ({average_speed}) => 0 < average_speed,
    tooltip: ({average_speed}) => `🏁 ${formatSpeed(average_speed, 3)}`,
    icon: MdOutlineSpeed,
    sortType: 'average_speed',
  },
  {
    label: ({max_speed}) => formatSpeed(max_speed),
    isRelevant: ({max_speed}) => 0 < max_speed,
    icon: MdOutlineRocketLaunch,
    sortType: 'max_speed',
  },
  {
    label: ({average_watts}) => `${Math.round(average_watts ?? 0)} W`,
    isRelevant: ({average_watts}) => 0 < (average_watts ?? 0),
    tooltip: ({weighted_average_watts, max_watts}) =>
      weighted_average_watts
        ? `🏋️ ${Math.round(weighted_average_watts)} W 〰 💥 ${Math.round(max_watts ?? 0)} W`
        : null,
    icon: FiZap,
    sortType: 'average_watts',
  },
  {
    label: ({suffer_score}) => Math.round(suffer_score ?? 0),
    isRelevant: ({suffer_score}) => 0 < (suffer_score ?? 0),
    icon: TbPepper,
    sortType: 'suffer_score',
  },
  {
    label: ({average_cadence}) => Math.round(average_cadence ?? 0),
    isRelevant: ({average_cadence}) => 0 < (average_cadence ?? 0),
    icon: PiPinwheel,
    sortType: 'average_cadence',
  },
  {
    label: ({average_heartrate}) => Math.round(average_heartrate ?? 0),
    isRelevant: ({average_heartrate}) => 0 < (average_heartrate ?? 0),
    tooltip: ({max_heartrate}) => `🫀 ${Math.round(max_heartrate ?? 0)}`,
    icon: PiHeartbeatBold,
    sortType: 'average_heartrate',
  },
  {
    label: ({kudos_count}) => kudos_count,
    isRelevant: ({kudos_count}) => 0 < kudos_count,
    icon: TbThumbUp,
    sortType: 'kudos_count',
  },
];

export {TAGS};
