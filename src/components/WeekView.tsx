import {createElement, useState} from 'react';
import {IconButton, Table, Tbody, Td, Th, Thead, Tooltip, Tr} from '@chakra-ui/react';
import {PiPlus} from 'react-icons/pi';
import {useActivities, useAthlete, useLabels} from '../hooks';
import {arrayRotate, getActivityIcon, getActivityUrl, getGearEmoji, getWeekNumber} from '../models';
import {DetailedActivity} from '../models/strava';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const WeekView = () => {
  const [weekCount, setWeekCount] = useState<number>(5);
  const athlete = useAthlete();
  const [activities] = useActivities({
    withCommute: true,
    withPrivate: true,
    sort: 'date',
    sortDirection: 'asc',
    includedActivityTypes: [],
  });
  const getWeekLabel = useLabels();

  const incrementWeekCount = () => setWeekCount(weekCount => weekCount + 1);

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

  const lastWeeks = Object.fromEntries(Object.entries(dataPerWeek).slice(-weekCount).reverse());
  const mondayFirst = arrayRotate(WEEKDAYS, -1);

  return (
    <Table variant="striped" size={['sm', 'md']}>
      <Thead>
        <Tr>
          <Th>
            Week
            <IconButton onClick={incrementWeekCount} marginLeft="8px" aria-label="More" size="xs" icon={<PiPlus />} />
          </Th>
          {mondayFirst.map(weekDay => (
            <Th key={weekDay} background={weekDay === WEEKDAYS[new Date().getDay()] ? 'gray.700' : undefined}>
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
                <Td key={weekDay}>
                  <Tooltip label={`${activity.name} 〰 ${getGearEmoji(athlete, activity.gear_id)}`}>
                    <a target="_blank" href={getActivityUrl(activity)}>
                      {createElement(getActivityIcon(activity.sport_type, activity.commute))}
                    </a>
                  </Tooltip>
                </Td>
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
