import {Grid} from '@chakra-ui/react';
import {formatDay, formatDayRange} from '../../models/local-day';
import {Run, Streaks} from '../../models/streaks';
import {Figure, Panel} from './Panel';

type StreaksPanelProps = {streaks: Streaks; locale: string};

const plural = (length: number, unit: string): string => (1 === length ? unit : `${unit}s`);

const span = ({from, to}: Run, locale: string): string | undefined =>
  null === from || null === to ? undefined : formatDayRange(from, to, locale);

/** Days and weeks in a row with an activity, and the longest time off. */
const StreaksPanel = ({streaks, locale}: StreaksPanelProps) => {
  const {longestDays, currentDays, longestWeeks, currentWeeks, longestBreak} = streaks;

  return (
    <Panel title="Streaks" note="local dates, weeks from Monday">
      <Grid templateColumns="repeat(2, minmax(0, 1fr))" gap="16px">
        <Figure
          value={String(longestDays.length)}
          unit={plural(longestDays.length, 'day')}
          caption="longest run of days"
          detail={span(longestDays, locale)}
        />
        <Figure
          value={String(currentDays.length)}
          unit={plural(currentDays.length, 'day')}
          caption="current day streak"
          detail={null === currentDays.from ? 'none going' : `since ${formatDay(currentDays.from, locale)}`}
        />
        <Figure
          value={String(longestWeeks.length)}
          unit={plural(longestWeeks.length, 'week')}
          caption="longest run of weeks"
          detail={span(longestWeeks, locale)}
        />
        <Figure
          value={String(currentWeeks.length)}
          unit={plural(currentWeeks.length, 'week')}
          caption="current week streak"
          detail={null === currentWeeks.from ? 'none going' : `since the week of ${formatDay(currentWeeks.from, locale)}`}
        />
        <Figure
          value={String(longestBreak.length)}
          unit={plural(longestBreak.length, 'day')}
          caption="longest break"
          detail={span(longestBreak, locale)}
        />
      </Grid>
    </Panel>
  );
};

export {StreaksPanel};
