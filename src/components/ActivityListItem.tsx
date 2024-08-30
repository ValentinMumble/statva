import {Icon, Skeleton, Tag, Td, Text, Tooltip, Tr} from '@chakra-ui/react';
import {SortType, TAGS, getActivityIcon, getActivityUrl, getGearEmoji, getHeartZone, getPowerZone} from '../models';
import {DetailedActivity, DetailedAthlete} from '../models/strava';
import {useAthlete, useFtp} from '../hooks';

const HEART_COLORS = ['transparent', '#abcf643a', '#e6d44c57', '#fab8334e', '#ff8e155b', '#ff4d114a'];
const POWER_COLORS = [...HEART_COLORS, '#ff0d0d50', '#ff0d0d50'];
const MONTH_COLORS = [
  '#FF000007', // Red
  '#0000FF07', // Blue
  '#00800007', // Green
  '#FFFF0007', // Yellow
  '#80008007', // Purple
  '#FFA50007', // Orange
  '#FFC0CB07', // Pink
  '#A52A2A07', // Brown
  '#80808007', // Gray
  '#00FFFF07', // Cyan
  '#FF634707', // Tomato (Red-Orange)
  '#00FF7F07', // Spring Green
];

const getBgColor = (bgOption: string, activity: DetailedActivity, athlete: DetailedAthlete | null): string => {
  switch (bgOption) {
    case 'power-zone':
      return POWER_COLORS[getPowerZone(activity.weighted_average_watts ?? 0, athlete?.ftp ?? 0)];
    case 'heart-zone':
      return HEART_COLORS[getHeartZone(activity)];
    case 'date':
    default:
      return MONTH_COLORS[new Date(activity.start_date).getMonth()];
  }
};

type ActivityListItemProps = {
  activity: DetailedActivity | null;
  activeSort?: SortType;
  enabledSorts: SortType[];
  bgOption: string;
};

const ActivityListItem = ({activity, activeSort, enabledSorts, bgOption}: ActivityListItemProps) => {
  const athlete = useAthlete();
  const getFtp = useFtp();

  if (null === activity) {
    return (
      <Tr>
        <Td padding="8px" width="1px">
          <Skeleton>i</Skeleton>
        </Td>
        <Td padding="4px">
          <Skeleton>name</Skeleton>
        </Td>
        {enabledSorts.map(sort => (
          <Td key={sort} padding="4px" width={`${Math.random() * 60}px`}>
            <Skeleton>tag</Skeleton>
          </Td>
        ))}
      </Tr>
    );
  }

  const ftp = getFtp(new Date(activity.start_date));

  return (
    <Tr onClick={() => console.log(activity)} opacity={activity.private ? 0.6 : 1} _hover={{opacity: 1}}>
      <Td padding={0} textAlign="center" width="1px">
        <Icon as={getActivityIcon(activity.sport_type, activity.commute)} />
      </Td>
      <Td padding="4px 0px">
        <Text bg={getBgColor(bgOption, activity, athlete)} fontSize="1rem" borderRadius="8px" padding="4px 10px">
          <Tooltip
            hasArrow={true}
            placement="right"
            label={
              <>
                {new Date(activity.start_date).toLocaleDateString()}&nbsp;&nbsp;
                {getGearEmoji(athlete, activity.gear_id)}
              </>
            }
          >
            <a target="_blank" href={getActivityUrl(activity)}>
              {activity.name}
            </a>
          </Tooltip>
        </Text>
      </Td>
      {TAGS.filter(({sortType}) => enabledSorts.includes(sortType)).map(tag => (
        <Td
          key={tag.sortType}
          textAlign="center"
          padding="0px 2px"
          width="1%"
          opacity={tag.isRelevant(activity) ? 0.9 : 0.4}
        >
          {null !== tag.label(activity, ftp) && (
            <Tooltip label={tag.tooltip?.(activity, athlete)}>
              <Tag size="sm" colorScheme={activeSort === tag.sortType ? 'orange' : 'facebook'}>
                {tag.label(activity, ftp)}
              </Tag>
            </Tooltip>
          )}
        </Td>
      ))}
    </Tr>
  );
};

export {ActivityListItem};
