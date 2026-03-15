import {useState} from 'react';
import {Flex, IconButton, Skeleton, Table, Tag} from '@chakra-ui/react';
import {RxCross2} from 'react-icons/rx';
import {Tooltip} from '../components/ui';
import {ActivityIcon, ActivityMeta} from '../components';
import {GetFtp, SortType, TAGS, getActivityUrl, getHeartZone, getPowerZone, getWorkoutType, getRandomUnusedEmoji, hasKom} from '../models';
import {Activity, DetailedActivity} from '../models/strava';
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
  fullActivity?: DetailedActivity | null;
  enabledSorts: SortType[];
  getFtp: GetFtp;
  showDeleteButton?: boolean;
  usedEmojis?: Set<string>;
  onDeleteActivity?: (id: number) => void;
};

const ActivityListItem = ({
  activity,
  fullActivity = null,
  enabledSorts,
  getFtp,
  showDeleteButton = false,
  usedEmojis,
  onDeleteActivity,
}: ActivityListItemProps) => {
  const {label} = useLabels();
  const [randomEmoji, setRandomEmoji] = useState<string | null>(null);

  if (null === activity) {
    return (
      <Table.Row>
        <Table.Cell>
          <Skeleton>🚴</Skeleton>
        </Table.Cell>
        <Table.Cell padding="2px" fontFamily="mono" fontSize="xs">
          <Skeleton>mon</Skeleton>
        </Table.Cell>
        <Table.Cell padding="2px">
          <Skeleton>Morning ride with the crew</Skeleton>
        </Table.Cell>
        {enabledSorts.map(sort => (
          <Table.Cell key={sort} padding="4px" width="60px" hideBelow="md">
            <Skeleton>12.3</Skeleton>
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
          hasKom={hasKom(fullActivity)}
          isCommute={activity.commute}
          isGranFondo={activity.distance > 100 * 1000}
          workoutType={getWorkoutType(activity)}
        />
      </Table.Cell>
      <Table.Cell padding="2px" textAlign="center"  fontSize="xs">
        {new Date(activity.start_date).toLocaleDateString('en-US', {weekday: 'short'}).toLowerCase()}
      </Table.Cell>
      <Table.Cell padding="2px">
        <Flex
          bg={getBgColor('date', activity, ftp)}
          borderRadius="8px"
          padding="2px 5px"
          justifyContent="space-between"
          alignItems="center"
        >
          <Flex gap="1" alignItems="center">
            <Tooltip
              positioning={{placement: 'right-end'}}
              content={
                <>
                  {new Date(activity.start_date).toLocaleDateString('fr-FR')} 〰
                  {label(activity.gear_id ?? activity.sport_type, true)}
                </>
              }
            >
              <a target="_blank" href={getActivityUrl(activity)}>
                {activity.name}
              </a>
            </Tooltip>
            {showDeleteButton && (
              <span
                style={{cursor: 'pointer'}}
                onClick={() => {
                  const emoji = getRandomUnusedEmoji(usedEmojis ?? new Set());
                  setRandomEmoji(emoji);
                  navigator.clipboard.writeText(emoji);
                }}
              >
                {randomEmoji ?? '🎲'}
              </span>
            )}
          </Flex>
          {showDeleteButton ? (
            <IconButton size="2xs" variant="ghost" onClick={() => onDeleteActivity?.(activity.id)}>
              <RxCross2 />
            </IconButton>
          ) : (
            <ActivityMeta activity={activity} />
          )}
        </Flex>
      </Table.Cell>
      {TAGS.filter(({sortType}) => enabledSorts.includes(sortType)).map(tag => {
        const {label, tooltip = null, isRelevant, colorPalette} = tag.value(activity, fullActivity, ftp);

        if (null === label || tag.excludedTypes?.includes(activity.sport_type)) {
          return <Table.Cell key={tag.sortType} />;
        }

        return (
          <Table.Cell key={tag.sortType} hideBelow="md" textAlign="center" opacity={isRelevant ? 0.9 : 0.4}>
            <Tooltip portalled={true} disabled={null === tooltip} content={tooltip}>
              <Tag.Root variant="subtle" colorPalette={colorPalette}>
                <Tag.Label>{label}</Tag.Label>
              </Tag.Root>
            </Tooltip>
          </Table.Cell>
        );
      })}
    </Table.Row>
  );
};

export {ActivityListItem};
