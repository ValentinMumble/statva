import {useEffect, useMemo, useRef, useState} from 'react';
import {Box, IconButton, Table} from '@chakra-ui/react';
import {LuPlus} from 'react-icons/lu';
import {Tooltip} from '../components/ui';
import {ActivityIcon, EditLabels} from '../components';
import {useActivities, useLabels} from '../hooks';
import {arrayRotate, getActivityUrl, TIMEFRAMES} from '../models';
import {Activity} from '../models/strava';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONDAY_FIRST = arrayRotate(WEEKDAYS, -1);
const FILL_COLOR = 'rgba(237,137,54,0.15)';
const STROKE_COLOR = 'rgba(237,137,54,0.7)';

type Week = {
  days: Record<string, Activity>;
  effort: number;
};

const buildWeekMap = (activities: Activity[]): Record<string, Week> =>
  activities.reduce((weekMap: Record<string, Week>, activity) => {
    const date = new Date(activity.start_date);
    const weekId = TIMEFRAMES.week.getPeriodKey(date);
    const weekday = WEEKDAYS[date.getDay()];

    if (!weekMap[weekId]) {
      weekMap[weekId] = {effort: 0, days: {}};
    }

    const existing = weekMap[weekId].days[weekday];
    if (!existing || activity.moving_time > existing.moving_time) {
      weekMap[weekId].days[weekday] = activity;
    }
    weekMap[weekId].effort += activity.suffer_score ?? 0;

    return weekMap;
  }, {});

const buildFunnelPaths = (currWidth: number, nextWidth: number) => {
  const tl = 50 - currWidth / 2;
  const tr = 50 + currWidth / 2;
  const bl = 50 - nextWidth / 2;
  const br = 50 + nextWidth / 2;
  return {
    fill: `M ${tl} 0 C ${tl} 50, ${bl} 50, ${bl} 100 L ${br} 100 C ${br} 50, ${tr} 50, ${tr} 0 Z`,
    left: `M ${tl} 0 C ${tl} 50, ${bl} 50, ${bl} 100`,
    right: `M ${tr} 0 C ${tr} 50, ${br} 50, ${br} 100`,
  };
};

const EffortFunnel = ({currWidth, nextWidth, effort}: {currWidth: number; nextWidth: number; effort: number}) => {
  const paths = buildFunnelPaths(currWidth, nextWidth);

  return (
    <Table.Cell textAlign="center" fontSize="12px" position="relative" overflow="hidden">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}>
        <path d={paths.fill} fill={FILL_COLOR} />
        <path d={paths.left} fill="none" stroke={STROKE_COLOR} strokeWidth={2} vectorEffect="non-scaling-stroke" />
        <path d={paths.right} fill="none" stroke={STROKE_COLOR} strokeWidth={2} vectorEffect="non-scaling-stroke" />
      </svg>
      <Box position="relative">{effort}</Box>
    </Table.Cell>
  );
};

const DayCell = ({activity, label}: {activity: Activity | null; label: (key: string, short?: boolean) => string}) =>
  activity ? (
    <Table.Cell textAlign="center">
      <Tooltip content={`${activity.name} 〰 ${label(activity.gear_id ?? activity.sport_type, true)}`}>
        <a target="_blank" href={getActivityUrl(activity)}>
          <ActivityIcon activityType={activity.sport_type} isCommute={activity.commute} />
        </a>
      </Tooltip>
    </Table.Cell>
  ) : (
    <Table.Cell textAlign="center">-</Table.Cell>
  );

const WeekView = () => {
  const [weekCount, setWeekCount] = useState(5);
  const {activities} = useActivities({withCommute: true, withPrivate: true, sort: 'date', sortDirection: 'asc'});
  const {label} = useLabels();
  const tableRef = useRef<HTMLTableElement>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Only scroll the newly-added row into view when the user expands weekCount, not on first load
    // (scrollIntoView scrolls the left column's scroll container, which would land it at the bottom).
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    tableRef.current?.querySelector('tr:last-child')?.scrollIntoView({behavior: 'smooth'});
  }, [weekCount]);

  const dataPerWeek = useMemo(() => buildWeekMap(activities ?? []), [activities]);
  const lastWeeks = Object.fromEntries(Object.entries(dataPerWeek).slice(-weekCount).reverse());
  const weekKeys = Object.keys(lastWeeks);
  const maxEffort = Math.max(...weekKeys.map(w => lastWeeks[w].effort), 1);
  const effortWidths = weekKeys.map(w => (lastWeeks[w].effort / maxEffort) * 100);

  return (
    <Table.Root ref={tableRef}>
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeader width="170px">
            Week
            <IconButton title="More" variant="ghost" onClick={() => setWeekCount(c => c + 1)} marginLeft="10px">
              <LuPlus />
            </IconButton>
            <EditLabels />
          </Table.ColumnHeader>
          {MONDAY_FIRST.map(weekDay => (
            <Table.ColumnHeader
              key={weekDay}
              background={weekDay === WEEKDAYS[new Date().getDay()] ? 'gray.900' : undefined}
              textAlign="center"
            >
              {weekDay.substring(0, 2)}
            </Table.ColumnHeader>
          ))}
          <Table.ColumnHeader textAlign="center">{label('suffer_score')}</Table.ColumnHeader>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {weekKeys.map((week, i) => (
          <Table.Row key={week}>
            <Table.Cell>{label(week)}</Table.Cell>
            {MONDAY_FIRST.map(weekDay => (
              <DayCell key={weekDay} activity={lastWeeks[week].days[weekDay] ?? null} label={label} />
            ))}
            <EffortFunnel
              currWidth={effortWidths[i]}
              nextWidth={effortWidths[i + 1] ?? effortWidths[i]}
              effort={lastWeeks[week].effort}
            />
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
};

export {WeekView};
