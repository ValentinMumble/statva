import {Flex, Skeleton, Table} from '@chakra-ui/react';
import {Tooltip, Tag} from '../components/ui';
import {ActivityIcon, ActivityMeta} from '../components';
import {GetFtp, SortType, TAGS, getActivityUrl, getHeartZone, getPowerZone, getWorkoutType} from '../models';
import {Activity} from '../models/strava';
import {useLabels} from '../hooks';

const HEART_COLORS = ['transparent', '#abcf643a', '#e6d44c57', '#fab8334e', '#ff8e155b', '#ff4d114a'];
const POWER_COLORS = [...HEART_COLORS, '#ff0d0d50', '#ff0d0d50'];
const MONTH_COLORS = [
  '#FF000015', // Red
  '#0000FF15', // Blue
  '#00800015', // Green
  '#FFFF0015', // Yellow
  '#80008015', // Purple
  '#FFA50015', // Orange
  '#FFC0CB15', // Pink
  '#A52A2A15', // Brown
  '#80808015', // Gray
  '#00FFFF15', // Cyan
  '#FF634715', // Tomato (Red-Orange)
  '#00FF7F15', // Spring Green
];

const getBgColor = (bgOption: string, activity: Activity, ftp: number): string => {
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
  activity: Activity | null;
  enabledSorts: SortType[];
  bgOption: string;
  getFtp: GetFtp;
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
        <ActivityIcon
          activityType={activity.sport_type}
          isCommute={activity.commute}
          workoutType={getWorkoutType(activity)}
        />
      </Table.Cell>
      <Table.Cell padding="2px">
        <Flex
          bg={getBgColor(bgOption, activity, ftp)}
          borderRadius="8px"
          padding="2px 5px"
          justifyContent="space-between"
          alignItems="center"
        >
          <Tooltip
            positioning={{placement: 'right-end'}}
            content={
              <>
                {new Date(activity.start_date).toLocaleDateString()} 〰
                {label(activity.gear_id ?? activity.sport_type, true)}
              </>
            }
          >
            <a target="_blank" href={getActivityUrl(activity)}>
              {activity.name}
            </a>
          </Tooltip>
          <ActivityMeta activity={activity} />
        </Flex>
      </Table.Cell>
      {TAGS.filter(({sortType}) => enabledSorts.includes(sortType)).map(tag => {
        const label = tag.label(activity, ftp);
        const tooltip = tag.tooltip?.(activity, ftp) ?? null;

        if (null === label || tag.excludedTypes?.includes(activity.sport_type)) {
          return <Table.Cell key={tag.sortType} />;
        }

        const tagContent = <Tag variant="subtle">{label}</Tag>;

        return (
          <Table.Cell
            key={tag.sortType}
            hideBelow="md"
            textAlign="center"
            opacity={tag.isRelevant(activity) ? 0.9 : 0.4}
          >
            {null === tooltip ? (
              tagContent
            ) : (
              <Tooltip portalled={true} content={tooltip}>
                {tagContent}
              </Tooltip>
            )}
          </Table.Cell>
        );
      })}
    </Table.Row>
  );
};

export {ActivityListItem};
