import {Icon, Skeleton, Tag, Td, Text, Tooltip, Tr} from '@chakra-ui/react';
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
  activity: DetailedActivity | null;
  activeSort: SortType;
  bgOption: string;
};

const ActivityListItem = ({activity, activeSort, bgOption}: ActivityListItemProps) => {
  const athlete = useAthlete();

  if (null === activity) {
    return (
      <Tr>
        <Td padding="4px" width={1}>
          <Skeleton>i</Skeleton>
        </Td>
        <Td padding="8px">
          <Skeleton>name</Skeleton>
        </Td>
        {TAGS.map((_, index) => (
          <Td key={index} padding="5px" width="1%">
            <Skeleton>tag</Skeleton>
          </Td>
        ))}
      </Tr>
    );
  }

  return (
    <Tr onClick={() => console.log(activity)} opacity={activity.private ? 0.6 : 1} _hover={{opacity: 1}}>
      <Td padding={0} textAlign="center" width={1}>
        <Icon as={getActivityIcon(activity)} />
      </Td>
      <Td padding="4px 0px">
        <Text bg={getBgColor(bgOption, activity, athlete)} fontSize="1rem" borderRadius="8px" padding="4px 10px">
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
      </Td>
      {TAGS.map((tag, index) => (
        <Td key={index} textAlign="center" padding="0px 2px" width="1%" opacity={tag.isRelevant(activity) ? 1 : 0.4}>
          <Tooltip label={tag.tooltip?.(activity, athlete)}>
            <Tag size="sm" colorScheme={activeSort === tag.sortType ? 'orange' : undefined}>
              {tag.label(activity)}
            </Tag>
          </Tooltip>
        </Td>
      ))}
    </Tr>
  );
};

export {ActivityListItem};
