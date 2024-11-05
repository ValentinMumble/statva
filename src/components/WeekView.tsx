import {useState} from 'react';
import {IconButton, Table} from '@chakra-ui/react';
import {LuPlus} from 'react-icons/lu';
import {Tooltip} from '../components/ui';
import {ActivityIcon} from '../components';
import {useActivities, useLabels} from '../hooks';
import {arrayRotate, getActivityUrl, getWeekNumber} from '../models';
import {DetailedActivity} from '../models/strava';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const WeekView = () => {
  const [weekCount, setWeekCount] = useState<number>(5);
  const [activities] = useActivities({
    withCommute: true,
    withPrivate: true,
    sort: 'date',
    sortDirection: 'asc',
  });
  const [label] = useLabels();

  const incrementWeekCount = () => setWeekCount(weekCount => weekCount + 1);

  const dataPerWeek = (activities ?? []).reduce(
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
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeader>
            Week
            <IconButton title="More" variant="ghost" onClick={incrementWeekCount} marginLeft="10px">
              <LuPlus />
            </IconButton>
          </Table.ColumnHeader>
          {mondayFirst.map(weekDay => (
            <Table.ColumnHeader
              key={weekDay}
              background={weekDay === WEEKDAYS[new Date().getDay()] ? 'gray.900' : undefined}
              textAlign="center"
            >
              {weekDay.substring(0, 2)}
            </Table.ColumnHeader>
          ))}
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {Object.keys(lastWeeks).map(week => (
          <Table.Row key={week}>
            <Table.Cell>{label(week)}</Table.Cell>
            {mondayFirst.map(weekDay => {
              const activity = lastWeeks[week][weekDay] ?? null;

              return activity ? (
                <Table.Cell key={weekDay} textAlign="center">
                  <Tooltip content={`${activity.name} 〰 ${label(activity.gear_id ?? activity.sport_type, true)}`}>
                    <a target="_blank" href={getActivityUrl(activity)}>
                      <ActivityIcon activityType={activity.sport_type} isCommute={activity.commute} />
                    </a>
                  </Tooltip>
                </Table.Cell>
              ) : (
                <Table.Cell key={weekDay} textAlign="center">
                  -
                </Table.Cell>
              );
            })}
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
};

export {WeekView};
