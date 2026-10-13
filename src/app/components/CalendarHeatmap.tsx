import {useMemo, useState} from 'react';
import {Box, Grid, Text} from '@chakra-ui/react';
import {activityYears, buildCalendar, heatLevel} from '../../models/calendar';
import {formatDay} from '../../models/local-day';
import {DetailedActivity} from '../../models/strava';
import {formatDistance} from '../../models/util';
import {HeatCell, HeatLegend} from './HeatScale';
import {Panel, YearSelect} from './Panel';

// Rows with a name; the others stay blank, as GitHub does, so the labels do not crowd.
const WEEKDAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];
const LABEL_WIDTH = 28;
// Below this a square is too small to see, so a phone scrolls the year sideways instead.
const MIN_SQUARE = 11;
const GAP = 3;

type CalendarHeatmapProps = {activities: DetailedActivity[]; locale: string};

const activityCount = (count: number): string => `${count} ${1 === count ? 'activity' : 'activities'}`;

/** One square per day of a year, darker or brighter the further you went that day. */
const CalendarHeatmap = ({activities, locale}: CalendarHeatmapProps) => {
  const years = useMemo(() => activityYears(activities), [activities]);
  const [picked, setPicked] = useState<number | null>(null);
  const year = picked ?? years.at(0) ?? null;
  const calendar = useMemo(() => (null === year ? null : buildCalendar(activities, year)), [activities, year]);

  if (null === year || null === calendar) return null;

  const daysOut = calendar.days.filter(({count}) => 0 < count);
  const total = daysOut.reduce((sum, {distance}) => sum + distance, 0);

  return (
    <Panel
      title="Calendar"
      note={`${daysOut.length} days out · ${formatDistance(total)}`}
      action={<YearSelect years={years} value={year} onChange={setPicked} />}
    >
      <Box overflowX="auto">
        <Grid
          templateColumns={`${LABEL_WIDTH}px repeat(${calendar.columns}, minmax(${MIN_SQUARE}px, 1fr))`}
          gap={`${GAP}px`}
          minWidth={`${LABEL_WIDTH + calendar.columns * (MIN_SQUARE + GAP)}px`}
          alignItems="center"
        >
          {calendar.months.map(({month, column}) => (
            <Text
              key={month}
              gridColumn={column + 2}
              gridRow={1}
              fontSize="10px"
              color="fg.muted"
              whiteSpace="nowrap"
              overflow="visible"
              width="0"
            >
              {formatDay(`${year}-${String(month).padStart(2, '0')}-01`, locale, {day: undefined, year: undefined})}
            </Text>
          ))}
          {WEEKDAY_LABELS.map((weekday, row) => (
            <Text key={row} gridColumn={1} gridRow={row + 2} fontSize="10px" color="fg.muted" lineHeight="1">
              {weekday}
            </Text>
          ))}
          {calendar.days.map(({day, column, row, distance, count}) => (
            <HeatCell
              key={day}
              gridColumn={column + 2}
              gridRow={row + 2}
              level={heatLevel(distance, calendar.max, 0 < count)}
              title={`${formatDay(day, locale, {weekday: 'short', year: undefined})} · ${
                0 === count ? 'nothing' : `${formatDistance(distance)}, ${activityCount(count)}`
              }`}
            />
          ))}
        </Grid>
      </Box>
      <HeatLegend low="0" high={`${formatDistance(calendar.max)} in a day`} />
    </Panel>
  );
};

export {CalendarHeatmap};
