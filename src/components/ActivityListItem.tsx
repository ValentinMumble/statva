import {HStack, ListIcon, ListItem, Spacer, Tag, TagLabel, TagLeftIcon} from '@chakra-ui/react';
import {IconType} from 'react-icons';
import {GiPathDistance} from 'react-icons/gi';
import {
  MdOutlineShowChart,
  MdOutlineTimer,
  MdOutlineSpeed,
  MdOutlineRocketLaunch,
  MdOutlineElectricBolt,
} from 'react-icons/md';
import {
  ACTIVITY_URL,
  DetailedActivity,
  SortType,
  formatDistance,
  formatDuration,
  formatElevation,
  formatSpeed,
  getActivityIcon,
} from '../models';

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
    icon: MdOutlineElectricBolt,
    sortType: 'average_watts',
  },
];

type ActivityListItemProps = {
  activity: DetailedActivity;
  activeSort: SortType;
};

const ActivityListItem = ({activity, activeSort}: ActivityListItemProps) => {
  return (
    <ListItem height={8}>
      <HStack>
        <ListIcon as={getActivityIcon(activity)} />
        <a target="_blank" href={`${ACTIVITY_URL}${activity.id}`}>
          {activity.name}
        </a>
        <Spacer />
        {TAGS.map(tag => (
          <Tag key={tag.sortType} colorScheme={activeSort === tag.sortType ? 'orange' : undefined}>
            <TagLeftIcon as={tag.icon}></TagLeftIcon>
            <TagLabel>{tag.label(activity)}</TagLabel>
          </Tag>
        ))}
      </HStack>
    </ListItem>
  );
};

export {ActivityListItem};
