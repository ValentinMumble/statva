import {createElement} from 'react';
import {Table, Tbody, Td, Th, Thead, Tooltip, Tr} from '@chakra-ui/react';
import {useActivities} from '../hooks';
import {arrayRotate, getActivityIcon, getWeekNumber} from '../models';
import {DetailedActivity} from '../models/strava';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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

  const lastWeeks = Object.fromEntries(Object.entries(dataPerWeek).slice(-5).reverse());
  const thisWeek = `${getWeekNumber(new Date())}/${new Date().getUTCFullYear()}`;
  const mondayFirst = arrayRotate<string>(WEEKDAYS, -1);

  return (
    <Table variant="striped" colorScheme="orange">
      <Thead>
        <Tr>
          <Th>Week</Th>
          {mondayFirst.map(weekDay => (
            <Th key={weekDay}>{weekDay.substring(0, 2)}</Th>
          ))}
        </Tr>
      </Thead>
      <Tbody>
        {Object.keys(lastWeeks).map(week => (
          <Tr key={week}>
            <Td>{week === thisWeek ? 'This week' : week}</Td>
            {mondayFirst.map(weekDay => {
              const activity = lastWeeks[week][weekDay];

              return activity ? (
                <Tooltip key={weekDay} label={activity.name}>
                  <Td>{createElement(getActivityIcon(lastWeeks[week][weekDay]))}</Td>
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
