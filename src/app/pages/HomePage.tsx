import {useMemo, useState} from 'react';
import {Badge, Box, Button, Grid, HStack, Icon, Image, Skeleton, Stack, Text} from '@chakra-ui/react';
import {Link} from 'react-router';
import {FaThumbsUp} from 'react-icons/fa6';
import {LogEvent} from '../../components/event';
import {useAllActivities, useEvents, useFtp, useLabels, useSettings, useSomeActivityDetails} from '../../hooks';
import {
  computeBikeParts,
  eddingtonNumber,
  Event,
  extractNormalizedPower,
  getTypes,
  getPowerZone,
  getZoneColor,
  PartState,
  weekSummary,
} from '../../models';
import {Activity, ActivityType} from '../../models/strava';
import {Card, CardTitle} from '../components/Card';
import {HighlightTags} from '../components/HighlightTags';
import {RouteThumb} from '../components/RouteThumb';
import {sportIcon, sportName} from '../components/sport';
import {zoneTextColor} from '../components/zone';
import {WeeksCard} from '../components/WeeksCard';
import {change, duration, km, metres, number, relativeDay} from '../format';

const LATEST_COUNT = 6;
// Strava's own orange, for its kudos thumb.
const STRAVA_ORANGE = '#fc4c02';


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

  // Against the same days of last week, so a big weekend still to come does not count yet.
  return (
    <Text fontSize="xs" color={0 <= percent ? 'green.fg' : 'fg.muted'} title={`${lastWeek} in all last week`}>
      {0 <= percent ? '▲' : '▼'} {Math.abs(percent)}% vs this time last week
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
      {0 < current.count && (
        <HStack gap="16px" flexWrap="wrap" marginTop="16px" fontSize="sm">
          {current.bySport.map(({sport, count, commutes}) => (
            <HStack key={sport} gap="6px">
              <Icon as={sportIcon(sport)} color="fg.muted" />
              <Text fontWeight="semibold">{count}</Text>
              <Text color="fg.muted">
                {sportName(sport)}
                {0 < commutes && ` · ${commutes} ${1 === commutes ? 'commute' : 'commutes'}`}
              </Text>
            </HStack>
          ))}
        </HStack>
      )}
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

const LatestActivities = ({activities, locale, now}: {activities: Activity[]; locale: string; now: Date}) => {
  const {getFtp} = useFtp();
  const {unprocessedEmoji} = useSettings();
  const latest = activities.slice(0, LATEST_COUNT);
  // Photos and normalized power live in the details: only these few are fetched.
  const details = useSomeActivityDetails(latest.map(({id}) => id));

  return (
    <Card>
      <CardTitle to="/activities">Latest</CardTitle>
      <Stack gap="4px">
        {latest.map(activity => {
          const detail = details[activity.id] ?? null;
          const np = extractNormalizedPower(detail);
          const photo = detail?.photos?.primary?.urls?.[100];

          return (
            <Link key={activity.id} to={`/activities/${activity.id}`}>
              <HStack
                gap="14px"
                padding="8px"
                marginX="-8px"
                borderRadius="12px"
                // Dimmed when private, as in the activities list.
                opacity={activity.private ? 0.6 : 1}
                _hover={{background: 'bg.subtle'}}
              >
                <RouteThumb activity={activity} />
                <Stack gap="2px" minWidth="0" flex="1">
                  <HStack gap="8px" minWidth="0">
                    <Text fontWeight="medium" truncate={true}>
                      {activity.name}
                    </Text>
                    <HighlightTags activity={activity} showPrivate={true} showUnprocessed={unprocessedEmoji} />
                  </HStack>
                  <HStack gap="6px" fontSize="sm" color="fg.muted" minWidth="0">
                    <Icon as={sportIcon(activity.sport_type)} flexShrink={0} />
                    <Text truncate={true}>
                      {sportName(activity.sport_type)} · {relativeDay(new Date(activity.start_date), locale, now)}
                      {activity.commute ? ' · commute' : ''}
                    </Text>
                    {/* Kept out of the truncated text, so a long line never hides it. */}
                    {0 < activity.kudos_count && (
                      <HStack gap="4px" flexShrink={0} title={`${activity.kudos_count} kudos`}>
                        <Text>·</Text>
                        <Icon as={FaThumbsUp} color={STRAVA_ORANGE} boxSize="12px" />
                        <Text>{activity.kudos_count}</Text>
                      </HStack>
                    )}
                  </HStack>
                </Stack>
                {undefined !== photo && (
                  <Image src={photo} alt="" boxSize="44px" borderRadius="8px" objectFit="cover" flexShrink={0} hideBelow="sm" />
                )}
                {null !== np && (
                  <Stack gap="0" alignItems="flex-end" flexShrink={0}>
                    <Text fontFamily="figure" fontWeight="semibold" color={zoneTextColor(getZoneColor(getPowerZone(np, getFtp(new Date(activity.start_date)))))}>
                      {np} W
                    </Text>
                    <Text fontSize="sm" color="fg.muted">
                      NP
                    </Text>
                  </Stack>
                )}
                <Stack gap="0" alignItems="flex-end" flexShrink={0} minWidth="56px">
                  <Text fontFamily="figure" fontWeight="semibold">
                    {0 < activity.distance ? km(activity.distance, locale) : duration(activity.moving_time)}
                  </Text>
                  <Text fontSize="sm" color="fg.muted">
                    {0 < activity.distance ? duration(activity.moving_time) : ' '}
                  </Text>
                </Stack>
              </HStack>
            </Link>
          );
        })}
      </Stack>
    </Card>
  );
};

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

/** The Eddington number of rides (E days of at least E km), this year's, and how close the next one is. */
const EddingtonCard = ({activities, locale, now}: {activities: Activity[]; locale: string; now: Date}) => {
  const rides = useMemo(() => {
    const types = getTypes(ActivityType.Ride);

    return activities.filter(({sport_type}) => types.includes(sport_type));
  }, [activities]);
  const [eddington, needed] = useMemo(() => eddingtonNumber(rides), [rides]);
  const [thisYear] = useMemo(() => eddingtonNumber(rides.filter(({start_date}) => new Date(start_date).getFullYear() === now.getFullYear())), [rides, now]);
  const next = eddington + 1;
  const done = next - needed;

  return (
    <Card>
      <CardTitle to="/records" linkLabel="Records">
        Eddington
      </CardTitle>
      <HStack justifyContent="space-between" alignItems="baseline" gap="12px">
        <Text fontFamily="figure" fontSize="3xl" fontWeight="semibold" lineHeight="1">
          {eddington}
          <Text as="span" fontSize="md" color="fg.muted" fontWeight="normal">
            {' '}
            km
          </Text>
        </Text>
        <Text fontSize="sm" color="fg.muted">
          {thisYear} km in {now.getFullYear()}
        </Text>
      </HStack>
      <Text fontSize="sm" color="fg.muted" marginTop="4px" marginBottom="14px">
        {eddington} days of {eddington} km or more
      </Text>
      <Box height="6px" borderRadius="full" background="bg.muted" overflow="hidden">
        <Box height="full" borderRadius="full" background="brand.solid" width={`${Math.max(3, (done / next) * 100)}%`} />
      </Box>
      <Text fontSize="xs" color="fg.muted" marginTop="6px">
        {number(done, locale)} of {number(next, locale)} days of {next} km: {needed} more for the next
      </Text>
    </Card>
  );
};

const BikeCard = ({activities, locale}: {activities: Activity[]; locale: string}) => {
  const {defaultBike, partRules} = useSettings();
  const {events, refetch} = useEvents();
  const {label} = useLabels();
  const bikeActivities = useMemo(() => activities.filter(({gear_id}) => defaultBike === gear_id), [activities, defaultBike]);
  // The most worn parts, and always the chain, the part looked after most often: when it is not
  // among them, it takes the last place.
  const parts = useMemo(() => {
    const all = computeBikeParts(events, bikeActivities, defaultBike, label, partRules);
    const worn = all.slice(0, PARTS_SHOWN);
    const chain = all.find(({type}) => 'chain' === type);

    return undefined === chain || worn.includes(chain) ? worn : [...worn.slice(0, PARTS_SHOWN - 1), chain];
  }, [events, bikeActivities, defaultBike, label, partRules]);
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
  const {locale} = useSettings();
  // Read once per visit, so the page renders the same way every time React redraws it.
  const [now] = useState(() => new Date());
  const activities = useMemo(
    () => [...(data ?? [])].sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()),
    [data],
  );

  return (
    <Stack gap={{base: '16px', md: '24px'}}>
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
            <Stack gap={{base: '16px', md: '24px'}}>
              <BikeCard activities={activities} locale={locale} />
              <EddingtonCard activities={activities} locale={locale} now={now} />
            </Stack>
          </Grid>
        </>
      )}
    </Stack>
  );
};

export {HomePage};
