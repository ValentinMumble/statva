import {useState} from 'react';
import {Button, Field, Grid, NativeSelect} from '@chakra-ui/react';
import {Slider, Switch} from '../../components/ui';
import {RideTiming} from '../../hooks/useRideTiming';
import {FORECAST_DAYS} from '../../models';
import {deviceDay} from '../../models/local-day';
import {duration, number} from '../format';

// The speeds the slider offers (km/h).
const SPEEDS = {min: 10, max: 45, step: 0.5};
// The stops the slider offers (min): up to 3 hours, or twice the default on a very long ride.
const STOP_STEP = 5;
const STOPS_MAX = 180;
const DAY_MS = 86400000;
// The start times offered, every quarter of an hour, as "HH:MM".
const TIMES = Array.from(
  {length: 96},
  (_, quarter) => `${String(Math.floor(quarter / 4)).padStart(2, '0')}:${String((quarter % 4) * 15).padStart(2, '0')}`,
);

type RideTimingFieldsProps = {
  timing: RideTiming;
  locale: string;
  // What "back to" calls the speed the ride came with: the rider's own, or the one shared.
  ownLabel: string;
  note?: string;
};

/** The day, start time, average speed, direction and stops of a planned ride. */
const RideTimingFields = ({timing, locale, ownLabel, note}: RideTimingFieldsProps) => {
  const {
    startDay,
    setStartDay,
    startTime,
    setStartTime,
    speed,
    setSpeed,
    ownSpeed,
    average,
    reversed,
    setReversed,
    stops,
    setStops,
    defaultStops,
    stopSeconds,
  } = timing;
  const [now] = useState(() => Date.now());
  const days = Array.from({length: FORECAST_DAYS - 1}, (_, offset) => new Date(now + offset * DAY_MS));
  // A shared ride opened later may start on a day already gone: it stays in the list.
  const listed = days.some(date => deviceDay(date) === startDay) ? days : [new Date(`${startDay}T12:00`), ...days];

  // All five on one row on a wide screen; the sliders take a whole row on a phone.
  return (
    <Grid
      templateColumns={{base: '1fr 1fr', md: 'repeat(3, minmax(0, 1fr))', lg: 'repeat(5, minmax(0, 1fr))'}}
      gap="12px"
    >
      <Field.Root>
        <Field.Label>Day</Field.Label>
        {/* A list rather than a date input, which shows the device's format whatever the page's. */}
        <NativeSelect.Root>
          <NativeSelect.Field value={startDay} onChange={({target}) => setStartDay(target.value)}>
            {listed.map(date => (
              <option key={deviceDay(date)} value={deviceDay(date)}>
                {date.toLocaleDateString(locale, {weekday: 'long', day: 'numeric', month: 'long'})}
              </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </Field.Root>
      <Field.Root>
        <Field.Label>Start</Field.Label>
        {/* A list too, as a time input shows the device's format (AM and PM) whatever the page's. */}
        <NativeSelect.Root>
          <NativeSelect.Field value={startTime} onChange={({target}) => setStartTime(target.value)}>
            {(TIMES.includes(startTime) ? TIMES : [startTime, ...TIMES]).map(time => (
              <option key={time} value={time}>
                {new Date(`2000-01-01T${time}`).toLocaleTimeString(locale, {hour: '2-digit', minute: '2-digit'})}
              </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </Field.Root>
      <Field.Root gridColumn={{base: 'span 2', md: 'auto'}}>
        <Field.Label>Average speed: {number(average, locale, 1)} km/h</Field.Label>
        <Slider
          width="full"
          size="sm"
          min={SPEEDS.min}
          max={SPEEDS.max}
          step={SPEEDS.step}
          value={[Math.min(SPEEDS.max, Math.max(SPEEDS.min, average))]}
          onValueChange={({value: [picked]}) => setSpeed(picked)}
        />
        <Field.HelperText>
          {note ?? ''}
          Slower on the climbs, faster elsewhere.{' '}
          {null !== speed && (
            <Button variant="plain" size="xs" height="auto" padding="0" onClick={() => setSpeed(null)}>
              Back to {ownLabel} ({number(ownSpeed, locale, 1)} km/h)
            </Button>
          )}
        </Field.HelperText>
      </Field.Root>
      <Field.Root gridColumn={{base: 'span 2', md: 'auto'}}>
        <Field.Label>Stops: {0 === stopSeconds ? 'none' : duration(stopSeconds)}</Field.Label>
        <Slider
          width="full"
          size="sm"
          min={0}
          max={Math.max(STOPS_MAX, Math.ceil((2 * defaultStops) / 60 / 30) * 30)}
          step={STOP_STEP}
          value={[Math.round(stopSeconds / 60)]}
          onValueChange={({value: [picked]}) => setStops(picked * 60)}
        />
        <Field.HelperText>
          {null === stops ? (
            'An eighth of the riding time, spread along the way.'
          ) : (
            <Button variant="plain" size="xs" height="auto" padding="0" onClick={() => setStops(null)}>
              Back to {Math.round(defaultStops / 60)} min
            </Button>
          )}
        </Field.HelperText>
      </Field.Root>
      <Field.Root>
        <Field.Label>Direction</Field.Label>
        <Switch checked={reversed} onCheckedChange={({checked}) => setReversed(checked)} marginTop="8px">
          The other way round
        </Switch>
      </Field.Root>
    </Grid>
  );
};

export {RideTimingFields};
