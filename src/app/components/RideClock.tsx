import {Fragment} from 'react';
import {Grid, Stack, Text} from '@chakra-ui/react';
import {heatLevel, RideClock as RideClockData} from '../../models/calendar';
import {HeatCell, HeatLegend} from './HeatScale';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
// Every hour would not fit on a phone, so only every sixth one is named.
const HOUR_STEP = 6;

const activityCount = (count: number): string => `${count} ${1 === count ? 'activity' : 'activities'}`;

/** Weekdays down, hours across: how many activities started in each slot, in local time. */
const RideClock = ({clock}: {clock: RideClockData}) => (
  <Stack gap="8px">
    <Grid templateColumns="28px repeat(24, 1fr)" gap="2px" alignItems="center">
      {[...Array(24).keys()].map(hour => (
        <Text
          key={hour}
          gridColumn={hour + 2}
          gridRow={1}
          fontSize="10px"
          color="fg.muted"
          whiteSpace="nowrap"
          width="0"
        >
          {0 === hour % HOUR_STEP ? `${hour}h` : ''}
        </Text>
      ))}
      {clock.counts.map((hours, weekday) => (
        <Fragment key={weekday}>
          <Text gridColumn={1} gridRow={weekday + 2} fontSize="10px" color="fg.muted" lineHeight="1">
            {WEEKDAYS[weekday]}
          </Text>
          {hours.map((count, hour) => (
            <HeatCell
              key={hour}
              gridColumn={hour + 2}
              gridRow={weekday + 2}
              level={heatLevel(count, clock.max)}
              title={`${WEEKDAYS[weekday]} ${hour}h · ${0 === count ? 'nothing' : activityCount(count)}`}
            />
          ))}
        </Fragment>
      ))}
    </Grid>
    <HeatLegend low="0" high={`${clock.max} in one slot`} />
  </Stack>
);

export {RideClock};
