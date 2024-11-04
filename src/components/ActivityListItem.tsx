import {Box, Skeleton, Table} from '@chakra-ui/react';
import {Tooltip, Tag} from '../components/ui';
import {ActivityIcon} from '../components';
import {SortType, TAGS,  getActivityUrl, getHeartZone, getPowerZone} from '../models';
import {DetailedActivity} from '../models/strava';
import {useLabels} from '../hooks';

const HEART_COLORS = ['transparent', '#abcf643a', '#e6d44c57', '#fab8334e', '#ff8e155b', '#ff4d114a'];
const POWER_COLORS = [...HEART_COLORS, '#ff0d0d50', '#ff0d0d50'];
const MONTH_COLORS = [
  '#FF000013', // Red
  '#0000FF13', // Blue
  '#00800013', // Green
  '#FFFF0013', // Yellow
  '#80008013', // Purple
  '#FFA50013', // Orange
  '#FFC0CB13', // Pink
  '#A52A2A13', // Brown
  '#80808013', // Gray
  '#00FFFF13', // Cyan
  '#FF634713', // Tomato (Red-Orange)
  '#00FF7F13', // Spring Green
];

const getBgColor = (bgOption: string, activity: DetailedActivity, ftp: number): string => {
  switch (bgOption) {
    case 'average_watts':
      return POWER_COLORS[getPowerZone(activity.weighted_average_watts ?? 0, ftp)];
    case 'average_heartrate':
      return HEART_COLORS[getHeartZone(activity)];
    case 'date':
    default:
      return MONTH_COLORS[new Date(activity.start_date).getMonth()];
  }
};

type ActivityListItemProps = {
  activity: DetailedActivity | null;
  enabledSorts: SortType[];
  bgOption: string;
  getFtp: (date: Date) => number;
};

const ActivityListItem = ({activity, enabledSorts, bgOption, getFtp}: ActivityListItemProps) => {
  const [label] = useLabels();

  if (null === activity) {
    return (
      <Table.Row>
        <Table.Cell>
          <Skeleton>i</Skeleton>
        </Table.Cell>
        <Table.Cell padding="4px">
          <Skeleton>name</Skeleton>
        </Table.Cell>
        {enabledSorts.map(sort => (
          <Table.Cell key={sort} padding="4px" width="60px">
            <Skeleton>tag</Skeleton>
          </Table.Cell>
        ))}
      </Table.Row>
    );
  }

  const ftp = getFtp(new Date(activity.start_date));

  return (
    <Table.Row onClick={() => console.log(activity)} opacity={activity.private ? 0.6 : 1} _hover={{opacity: 1}}>
      <Table.Cell>
        <ActivityIcon activityType={activity.sport_type} isCommute={activity.commute} />
      </Table.Cell>
      <Table.Cell padding="2px">
        <Box bg={getBgColor(bgOption, activity, ftp)} borderRadius="8px" padding="2px 10px">
          <Tooltip
            positioning={{placement: 'right-end'}}
            content={
              <>
                {new Date(activity.start_date).toLocaleDateString()}&nbsp;&nbsp;
                {label(activity.gear_id, true)}
              </>
            }
          >
            <a target="_blank" href={getActivityUrl(activity)}>
              {activity.name}
            </a>
          </Tooltip>
        </Box>
      </Table.Cell>
      {TAGS.filter(({sortType}) => enabledSorts.includes(sortType)).map(tag => {
        const label = tag.label(activity, ftp);
        const tooltip = tag.tooltip?.(activity, ftp) ?? null;

        if (null === label || tag.excludedTypes?.includes(activity.sport_type)) {
          return <Table.Cell key={tag.sortType} />;
        }

        return (
          <Table.Cell key={tag.sortType} textAlign="center" opacity={tag.isRelevant(activity) ? 0.9 : 0.4}>
            {null === tooltip ? (
              <Tag variant="subtle">{label}</Tag>
            ) : (
              <Tooltip portalled={true} content={tooltip}>
                <Tag variant="subtle">{label}</Tag>
              </Tooltip>
            )}
          </Table.Cell>
        );
      })}
    </Table.Row>
  );
};

export {ActivityListItem};
