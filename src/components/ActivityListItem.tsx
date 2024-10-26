import {Icon, Skeleton, Table, Text} from '@chakra-ui/react';
import {SortType, TAGS, getActivityIcon, getActivityUrl, getGearEmoji, getHeartZone, getPowerZone} from '../models';
import {DetailedActivity, DetailedAthlete} from '../models/strava';
import {Tooltip, Tag} from '../components/ui';

const HEART_COLORS = ['transparent', '#abcf643a', '#e6d44c57', '#fab8334e', '#ff8e155b', '#ff4d114a'];
const POWER_COLORS = [...HEART_COLORS, '#ff0d0d50', '#ff0d0d50'];
const MONTH_COLORS = [
  '#FF000008', // Red
  '#0000FF08', // Blue
  '#00800008', // Green
  '#FFFF0008', // Yellow
  '#80008008', // Purple
  '#FFA50008', // Orange
  '#FFC0CB08', // Pink
  '#A52A2A08', // Brown
  '#80808008', // Gray
  '#00FFFF08', // Cyan
  '#FF634708', // Tomato (Red-Orange)
  '#00FF7F08', // Spring Green
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
  athlete: DetailedAthlete | null;
  activity: DetailedActivity | null;
  activeSort?: SortType;
  enabledSorts: SortType[];
  bgOption: string;
  getFtp: (date: Date) => number;
};

const ActivityListItem = ({athlete, activity, activeSort, enabledSorts, bgOption, getFtp}: ActivityListItemProps) => {
  if (null === activity || null === athlete) {
    return (
      <Table.Row>
        <Table.Cell padding="8px" width="1px">
          <Skeleton>i</Skeleton>
        </Table.Cell>
        <Table.Cell padding="4px">
          <Skeleton>name</Skeleton>
        </Table.Cell>
        {enabledSorts.map(sort => (
          <Table.Cell key={sort} padding="4px" width={`${Math.random() * 60}px`}>
            <Skeleton>tag</Skeleton>
          </Table.Cell>
        ))}
      </Table.Row>
    );
  }

  const ftp = getFtp(new Date(activity.start_date));

  return (
    <Table.Row onClick={() => console.log(activity)} opacity={activity.private ? 0.6 : 1} _hover={{opacity: 1}}>
      <Table.Cell padding={0} textAlign="center" width="1px">
        {/* <Icon as={getActivityIcon(activity.sport_type, activity.commute)} /> */}
      </Table.Cell>
      <Table.Cell padding="4px 0px">
        <Text bg={getBgColor(bgOption, activity, athlete)} fontSize="1rem" borderRadius="8px" padding="4px 10px">
          <Tooltip
            showArrow={true}
            // placement="right"
            content={
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
      </Table.Cell>
      {TAGS.filter(({sortType}) => enabledSorts.includes(sortType)).map(tag => (
        <Table.Cell
          key={tag.sortType}
          textAlign="center"
          padding="0px 2px"
          width="1%"
          opacity={tag.isRelevant(activity) ? 0.9 : 0.4}
        >
          {null !== tag.label(activity, ftp) && (
            <Tooltip content={tag.tooltip?.(activity, athlete)}>
              <Tag size="sm" colorScheme={activeSort === tag.sortType ? 'orange' : 'facebook'}>
                {tag.label(activity, ftp)}
              </Tag>
            </Tooltip>
          )}
        </Table.Cell>
      ))}
    </Table.Row>
  );
};

export {ActivityListItem};
