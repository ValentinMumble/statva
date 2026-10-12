import {useMemo, useState} from 'react';
import {Badge, Box, Button, Grid, HStack, Icon, Skeleton, Stack, Text} from '@chakra-ui/react';
import {LogEvent} from '../../components/event';
import {useAllActivities, useAthlete, useEvents, useLabels, useSettings} from '../../hooks';
import {computeBikeParts, Event, getActivityUrl, PartState, weekSummary} from '../../models';
import {Activity} from '../../models/strava';
import {Card, CardTitle} from '../components/Card';
import {RouteThumb} from '../components/RouteThumb';
import {sportIcon, sportName} from '../components/sport';
import {WeeksCard} from '../components/WeeksCard';
import {change, duration, km, metres, number, relativeDay} from '../format';

const LATEST_COUNT = 6;

const greeting = (hour: number): string => (hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening');

// Before anything is done this week, last week's total says more than a fall of 100%.
const Delta = ({current, previous, lastWeek}: {current: number; previous: number; lastWeek: string}) => {
  const percent = change(current, previous);

  if (0 === current) {
    return (
      <Text fontSize="xs" color="fg.muted">
        {lastWeek} last week
      </Text>
    );
  }
  if (null === percent) return null;

  return (
    <Text fontSize="xs" color={0 <= percent ? 'green.fg' : 'fg.muted'}>
      {0 <= percent ? '▲' : '▼'} {Math.abs(percent)}% vs last week
    </Text>
  );
};

const Figure = ({label, value, children}: {label: string; value: string; children?: React.ReactNode}) => (
  <Stack gap="2px">
    <Text fontSize="xs" color="fg.muted" textTransform="uppercase" letterSpacing="0.06em">
      {label}
    </Text>
    <Text fontFamily="figure" fontSize={{base: '2xl', md: '3xl'}} fontWeight="semibold" letterSpacing="-0.02em" lineHeight="1.1">
      {value}
    </Text>
    {children}
  </Stack>
);

const ThisWeek = ({activities, locale, now}: {activities: Activity[]; locale: string; now: Date}) => {
  const {current, previous, lastWeek, days} = useMemo(() => weekSummary(activities, now), [activities, now]);
  const longest = Math.max(...days.map(({distance}) => distance), 1);
  const today = now.toDateString();

  return (
    <Card>
      <CardTitle to="/stats" linkLabel="Stats">
        This week
      </CardTitle>
      <Grid templateColumns={{base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)'}} gap={{base: '16px', md: '24px'}}>
        <Figure label="Distance" value={km(current.distance, locale)}>
          <Delta current={current.distance} previous={previous.distance} lastWeek={km(lastWeek.distance, locale)} />
        </Figure>
        <Figure label="Time" value={duration(current.movingTime)}>
          <Delta current={current.movingTime} previous={previous.movingTime} lastWeek={duration(lastWeek.movingTime)} />
        </Figure>
        <Figure label="Climbing" value={metres(current.elevation, locale)}>
          <Delta current={current.elevation} previous={previous.elevation} lastWeek={metres(lastWeek.elevation, locale)} />
        </Figure>
        <Figure label="Training load" value={number(current.load, locale)}>
          <Delta current={current.load} previous={previous.load} lastWeek={number(lastWeek.load, locale)} />
        </Figure>
      </Grid>
      <HStack gap="6px" alignItems="flex-end" marginTop="20px" height="64px">
        {days.map(({date, distance}) => {
          const isToday = date.toDateString() === today;
          const isFuture = date.getTime() > now.getTime();

          return (
            <Stack key={date.toISOString()} flex="1" gap="6px" alignItems="stretch" height="full" justifyContent="flex-end">
              <Box
                height={0 === distance ? '3px' : `${Math.max(8, (distance / longest) * 44)}px`}
                borderRadius="4px"
                background={0 === distance ? 'bg.muted' : isToday ? 'brand.solid' : 'brand.emphasized'}
                title={0 === distance ? undefined : km(distance, locale)}
              />
              <Text fontSize="xs" textAlign="center" color={isToday ? 'fg' : 'fg.muted'} opacity={isFuture ? 0.5 : 1} fontWeight={isToday ? 'semibold' : 'normal'}>
                {date.toLocaleDateString(locale, {weekday: 'narrow'})}
              </Text>
            </Stack>
          );
        })}
      </HStack>
    </Card>
  );
};

const LatestActivities = ({activities, locale, now}: {activities: Activity[]; locale: string; now: Date}) => (
  <Card>
    <CardTitle to="/activities">Latest</CardTitle>
    <Stack gap="4px">
      {activities.slice(0, LATEST_COUNT).map(activity => (
        <a key={activity.id} href={getActivityUrl(activity)} target="_blank" rel="noreferrer">
          <HStack gap="14px" padding="8px" marginX="-8px" borderRadius="12px" _hover={{background: 'bg.subtle'}}>
            <RouteThumb activity={activity} />
            <Stack gap="2px" minWidth="0" flex="1">
              <Text fontWeight="medium" truncate={true}>
                {activity.name}
              </Text>
              <HStack gap="6px" fontSize="sm" color="fg.muted" minWidth="0">
                <Icon as={sportIcon(activity.sport_type)} flexShrink={0} />
                <Text truncate={true}>
                  {sportName(activity.sport_type)} · {relativeDay(new Date(activity.start_date), locale, now)}
                  {activity.commute ? ' · commute' : ''}
                </Text>
              </HStack>
            </Stack>
            <Stack gap="0" alignItems="flex-end" flexShrink={0}>
              <Text fontFamily="figure" fontWeight="semibold">
                {0 < activity.distance ? km(activity.distance, locale) : duration(activity.moving_time)}
              </Text>
              <Text fontSize="sm" color="fg.muted">
                {0 < activity.distance ? duration(activity.moving_time) : ' '}
              </Text>
            </Stack>
          </HStack>
        </a>
      ))}
    </Stack>
  </Card>
);

const PART_NAMES: Partial<Record<Event['type'], string>> = {
  chain: 'Chain',
  tire: 'Tires',
  cassette: 'Cassette',
  brake_pad: 'Brake pads',
  brake_bleed: 'Brake fluid',
  battery: 'Battery',
  saddle: 'Saddle',
};

const STATE_COLOR: Record<PartState, string> = {ok: 'green.solid', due: 'orange.solid', overdue: 'red.solid'};
const STATE_LABEL: Record<PartState, string> = {ok: 'Fine', due: 'Due soon', overdue: 'Overdue'};
const PARTS_SHOWN = 4;

const BikeCard = ({activities, locale}: {activities: Activity[]; locale: string}) => {
  const {defaultBike, partRules} = useSettings();
  const {events, refetch} = useEvents();
  const {label} = useLabels();
  const bikeActivities = useMemo(() => activities.filter(({gear_id}) => defaultBike === gear_id), [activities, defaultBike]);
  const parts = useMemo(
    () => computeBikeParts(events, bikeActivities, defaultBike, label, partRules).slice(0, PARTS_SHOWN),
    [events, bikeActivities, defaultBike, label, partRules],
  );
  const total = bikeActivities.reduce((sum, {distance}) => sum + distance, 0);

  return (
    <Card>
      <CardTitle to="/bike" linkLabel="Workshop">
        {label(defaultBike)}
      </CardTitle>
      <Text fontSize="sm" color="fg.muted" marginTop="-8px" marginBottom="16px">
        {km(total, locale)} ridden · most worn parts first
      </Text>
      <Stack gap="14px">
        {parts.map(part => (
          <Stack key={part.type} gap="6px">
            <HStack justifyContent="space-between" gap="8px">
              <Text fontSize="sm" truncate={true}>
                {part.name} {PART_NAMES[part.type] ?? part.type}{' '}
                <Text as="span" color="fg.muted">
                  {part.detail}
                </Text>
              </Text>
              {'ok' !== part.state && (
                <Badge size="sm" colorPalette={'due' === part.state ? 'orange' : 'red'} variant="subtle">
                  {STATE_LABEL[part.state]}
                </Badge>
              )}
            </HStack>
            <Box height="6px" borderRadius="full" background="bg.muted" overflow="hidden">
              <Box height="full" borderRadius="full" background={STATE_COLOR[part.state]} width={`${Math.min(100, Math.max(3, part.ratio * 100))}%`} />
            </Box>
            <Text fontSize="xs" color="fg.muted">
              {km(part.distance, locale)}
              {null !== part.expected && ` of ${km(part.expected, locale)}`}
            </Text>
          </Stack>
        ))}
      </Stack>
      <LogEvent
        bike={defaultBike}
        onLogged={refetch}
        trigger={
          <Button variant="outline" size="sm" width="full" marginTop="18px">
            Log a change on this bike
          </Button>
        }
      />
    </Card>
  );
};

/** What a rider wants on opening the app: how the week is going, what they just did, what needs doing. */
const HomePage = () => {
  const {data} = useAllActivities();
  const athlete = useAthlete();
  const {locale} = useSettings();
  // Read once per visit, so the page renders the same way every time React redraws it.
  const [now] = useState(() => new Date());
  const activities = useMemo(
    () => [...(data ?? [])].sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()),
    [data],
  );

  return (
    <Stack gap={{base: '16px', md: '24px'}}>
      <Stack gap="2px">
        <Text fontFamily="heading" fontSize={{base: '2xl', md: '3xl'}} fontWeight="bold" letterSpacing="-0.02em">
          {greeting(now.getHours())}
          {athlete ? `, ${athlete.firstname}` : ''}
        </Text>
        <Text color="fg.muted">{now.toLocaleDateString(locale, {weekday: 'long', day: 'numeric', month: 'long'})}</Text>
      </Stack>

      {undefined === data ? (
        <Stack gap="16px">
          <Skeleton height="180px" borderRadius="card" />
          <Skeleton height="320px" borderRadius="card" />
        </Stack>
      ) : (
        <>
          <ThisWeek activities={activities} locale={locale} now={now} />
          <Grid templateColumns={{base: 'minmax(0, 1fr)', lg: 'minmax(0, 1.6fr) minmax(0, 1fr)'}} gap={{base: '16px', md: '24px'}} alignItems="start">
            <Stack gap={{base: '16px', md: '24px'}}>
              <LatestActivities activities={activities} locale={locale} now={now} />
              <WeeksCard activities={activities} now={now} locale={locale} />
            </Stack>
            <BikeCard activities={activities} locale={locale} />
          </Grid>
        </>
      )}
    </Stack>
  );
};

export {HomePage};
