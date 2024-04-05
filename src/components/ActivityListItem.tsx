import {ListIcon, ListItem, Show, Tag, TagLabel, TagLeftIcon, Text, Tooltip} from '@chakra-ui/react';
import {SortType, TAGS, getActivityIcon, getActivityUrl, getBikeEmoji, getHeartZone, getPowerZone} from '../models';
import {DetailedActivity, DetailedAthlete} from '../models/strava';
import {useAthlete} from '../hooks';

const HEART_COLORS = ['transparent', '#abcf643a', '#e6d44c57', '#fab8334e', '#ff8e155b', '#ff4d114a'];
const POWER_COLORS = [...HEART_COLORS, '#ff0d0d50', '#ff0d0d50'];
const MONTH_COLORS = [
  '#F7D7D680', // Light Red
  '#D6F7F180', // Light Blue
  '#D9F7D980', // Mint
  '#E2D8F780', // Lavender
  '#F7DCF180', // Light Purple
  '#EAF7D980', // Light Green
  '#F7F6D880', // Pale Yellow
  '#F7E7E080', // Pale Pink
  '#F7E7D680', // Peach
  '#F7F0D780', // Light Orange
  '#D8EDF780', // Sky Blue
  '#F7DCEB80', // Light Pink
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
