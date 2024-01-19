import {ListIcon, ListItem, Show, Tag, TagLabel, TagLeftIcon, Text, Tooltip} from '@chakra-ui/react';
import {SortType, TAGS, getActivityIcon, getActivityUrl, getBikeEmoji, getHeartZone, getPowerZone} from '../models';
import {DetailedActivity, DetailedAthlete} from '../models/strava';
import {useAthlete} from '../hooks';

const HEART_COLORS = ['transparent', '#abcf643a', '#e6d44c57', '#fab8334e', '#ff8e155b', '#ff4d114a'];
const POWER_COLORS = [...HEART_COLORS, '#ff0d0d50', '#ff0d0d50'];
const MONTH_COLORS = [
  '#f0f8ff',
  '#f0ffff',
  '#f5f5dc',
  '#f5f5f5',
  '#fafad2',
  '#fdf5e6',
  '#f5ebfc',
  '#fff8dc',
  '#f0fff0',
  '#f8f8ff',
  '#f0fcf1',
  '#faf3e5',
];

const getBgColor = (bgOption: string, activity: DetailedActivity, athlete: DetailedAthlete | null): string => {
  switch (bgOption) {
    case 'power-zone':
      return POWER_COLORS[getPowerZone(activity, athlete?.ftp ?? 0)];
    case 'heart-zone':
      return HEART_COLORS[getHeartZone(activity)];
    case 'date':
    default:
      return MONTH_COLORS[new Date(activity.start_date).getMonth()];
  }
};

type ActivityListItemProps = {
  activity: DetailedActivity;
  activeSort: SortType;
  bgOption: string;
};

const ActivityListItem = ({activity, activeSort, bgOption}: ActivityListItemProps) => {
  const athlete = useAthlete();

  return (
    <ListItem
      onClick={() => console.log(activity)}
      opacity={activity.private ? 0.6 : 1}
      _hover={{opacity: 1}}
      width={['97vw', 'unset']}
      display="flex"
      alignItems="center"
      gap={1.5}
    >
      <ListIcon as={getActivityIcon(activity)} />
      <Text flex={1} bg={getBgColor(bgOption, activity, athlete)} padding="1px 5px" borderRadius="8px">
        <Tooltip
          bg="gray.100"
          color="gray.700"
          hasArrow={true}
          placement="right"
          label={
            <>
              {new Date(activity.start_date).toLocaleDateString()}&nbsp;&nbsp;
              {getBikeEmoji(athlete?.bikes, activity.gear_id)}
            </>
          }
        >
          <a target="_blank" href={getActivityUrl(activity)}>
            {activity.name}
          </a>
        </Tooltip>
      </Text>
      {TAGS.map((tag, index) => (
        <Show key={tag.sortType} above={0 === index ? undefined : 'sm'}>
          <Tooltip label={tag.tooltip?.(activity, athlete)}>
            <Tag
              opacity={tag.isRelevant(activity) ? 1 : 0.4}
              size="sm"
              colorScheme={activeSort === tag.sortType ? 'orange' : undefined}
              padding="4px"
            >
              <TagLeftIcon as={tag.icon} />
              <TagLabel>{tag.label(activity)}</TagLabel>
            </Tag>
          </Tooltip>
        </Show>
      ))}
    </ListItem>
  );
};

export {ActivityListItem};
