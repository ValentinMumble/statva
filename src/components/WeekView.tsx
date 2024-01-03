import {createElement} from 'react';
import {Table, Tbody, Td, Th, Thead, Tooltip, Tr} from '@chakra-ui/react';
import {useActivities} from '../hooks';
import {arrayRotate, getActivityIcon, getWeekNumber} from '../models';
import {DetailedActivity} from '../models/strava';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEK_COUNT = 5;

const getWeekLabel = (week: string): string => {
  const today = new Date(),
    lastWeek = new Date();
  lastWeek.setDate(today.getDate() - 7);

  if (week === `${getWeekNumber(today)}/${today.getUTCFullYear()}`) {
    return 'This week';
  }

  if (week === `${getWeekNumber(lastWeek)}/${lastWeek.getUTCFullYear()}`) {
    return 'Last week';
  }

  return week;
};

const WeekView = () => {
  const [activities] = useActivities({
    withCommute: true,
    withPrivate: true,
    sort: 'date',
    sortDirection: 'asc',
    includedActivityTypes: [],
  });

  const dataPerWeek = activities.reduce(
    (weekMap: {[weekId: string]: {[weekday: string]: DetailedActivity}}, activity) => {
      const date = new Date(activity.start_date);
      const weekId = `${getWeekNumber(date)}/${date.getUTCFullYear()}`;
      const weekday = WEEKDAYS[date.getDay()];
      const currentActivityTime = weekMap[weekId]?.[weekday]?.moving_time ?? 0;

      if (!weekMap[weekId]) {
        weekMap[weekId] = {};
      }

      weekMap[weekId][weekday] = activity.moving_time > currentActivityTime ? activity : weekMap[weekId][weekday];

      return weekMap;
    },
    {}
  );

  const lastWeeks = Object.fromEntries(Object.entries(dataPerWeek).slice(-WEEK_COUNT).reverse());
  const mondayFirst = arrayRotate(WEEKDAYS, -1);

  return (
    <Table variant="striped" colorScheme="orange" size={['sm', 'md']}>
      <Thead>
        <Tr>
          <Th>Week</Th>
          {mondayFirst.map(weekDay => (
            <Th key={weekDay} background={weekDay === WEEKDAYS[new Date().getDay()] ? 'orange.100' : undefined}>
              {weekDay.substring(0, 2)}
            </Th>
          ))}
        </Tr>
      </Thead>
      <Tbody>
        {Object.keys(lastWeeks).map(week => (
          <Tr key={week}>
            <Td>{getWeekLabel(week)}</Td>
            {mondayFirst.map(weekDay => {
              const activity = lastWeeks[week][weekDay] ?? null;

              return activity ? (
                <Tooltip key={weekDay} label={activity.name}>
                  <Td>{createElement(getActivityIcon(activity))}</Td>
                </Tooltip>
              ) : (
                <Td key={weekDay}>-</Td>
              );
            })}
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
};

export {WeekView};
