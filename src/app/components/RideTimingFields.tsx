import {useState} from 'react';
import {Button, Field, Grid, Input, NativeSelect} from '@chakra-ui/react';
import {Slider} from '../../components/ui';
import {RideTiming} from '../../hooks/useRideTiming';
import {FORECAST_DAYS} from '../../models';
import {deviceDay} from '../../models/local-day';
import {number} from '../format';

// The speeds the slider offers (km/h).
const SPEEDS = {min: 10, max: 45, step: 0.5};
const DAY_MS = 86400000;

type RideTimingFieldsProps = {
  timing: RideTiming;
  locale: string;
  // What "back to" calls the speed the ride came with: the rider's own, or the one shared.
  ownLabel: string;
  note?: string;
};

/** The day, start time and average speed of a planned ride. */
const RideTimingFields = ({timing, locale, ownLabel, note}: RideTimingFieldsProps) => {
  const {startDay, setStartDay, startTime, setStartTime, speed, setSpeed, ownSpeed, average} = timing;
  const [now] = useState(() => Date.now());
  const days = Array.from({length: FORECAST_DAYS - 1}, (_, offset) => new Date(now + offset * DAY_MS));
  // A shared ride opened later may start on a day already gone: it stays in the list.
  const listed = days.some(date => deviceDay(date) === startDay) ? days : [new Date(`${startDay}T12:00`), ...days];

  return (
    <Grid templateColumns={{base: '1fr 1fr', md: 'repeat(3, 1fr)'}} gap="12px">
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
        <Input type="time" value={startTime} onChange={({target}) => setStartTime(target.value)} />
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
    </Grid>
  );
};

export {RideTimingFields};
