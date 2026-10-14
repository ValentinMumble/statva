import {Suspense, useMemo, useState} from 'react';
import {Box, Button, Grid, HStack, SegmentGroup, Spinner, Stack, Tabs, Text} from '@chakra-ui/react';
import {useLocalStorage} from 'usehooks-ts';
import {useAllActivities, useLabels, useSettings} from '../../hooks';
import {eddingtonNumber, formatCalories, formatDistance, formatDistanceMeters, formatDuration, getTypes, isClubRide} from '../../models';
import {Activity, ActivityType} from '../../models/strava';
import {
  ActivityTimeChart,
  AerobicFitnessChart,
  AverageGearChart,
  CommuteRoutes,
  CommuteSpeedChart,
  CourtPieChart,
  DataLineChart,
  EddingtonChart,
  EddingtonDayChart,
  FinishPieChart,
  FTPChart,
  GearChart,
  GradesChart,
  GroupChart,
  HeartChart,
  HeartRateDriftChart,
  NPGroupPieChart,
  PoolPieChart,
  PowerCurveChart,
  PowerZonesChart,
  ProgressChart,
  RunBestTimes,
  TimeframeChart,
} from '../../components/charts/lazy-charts';
import {Card, CardTitle} from '../components/Card';
import {duration, km, metres, number} from '../format';

type Period = 'year' | 'twelve' | 'all';

const PERIODS = [
  {value: 'year', label: 'This year'},
  {value: 'twelve', label: '12 months'},
  {value: 'all', label: 'All time'},
];

const DAY_MS = 86400000;
// The chip for every sport at once, next to the rider's own sports.
const ALL = 'All';

const startOf = (period: Period, now: Date): number =>
  'year' === period ? new Date(now.getFullYear(), 0, 1).getTime() : 'twelve' === period ? now.getTime() - 365 * DAY_MS : 0;

const Figure = ({label, value, hint}: {label: string; value: string; hint?: string}) => (
  <Stack gap="0">
    <Text fontSize="xs" color="fg.muted" textTransform="uppercase" letterSpacing="0.06em">
      {label}
    </Text>
    <Text fontFamily="figure" fontSize={{base: 'xl', md: '2xl'}} fontWeight="semibold">
      {value}
    </Text>
    {undefined !== hint && (
      <Text fontSize="xs" color="fg.muted">
        {hint}
      </Text>
    )}
  </Stack>
);

/** How far this year's riding is from the goal, and where the current pace ends up. */
const YearGoal = ({rides, goalKm, now, locale}: {rides: Activity[]; goalKm: number; now: Date; locale: string}) => {
  const yearStart = new Date(now.getFullYear(), 0, 1).getTime();
  const yearEnd = new Date(now.getFullYear() + 1, 0, 1).getTime();
  const done = rides.filter(({start_date}) => new Date(start_date).getTime() >= yearStart).reduce((sum, {distance}) => sum + distance, 0) / 1000;
  const elapsed = (now.getTime() - yearStart) / (yearEnd - yearStart);
  const projected = 0 < elapsed ? done / elapsed : 0;
  const ratio = Math.min(1, done / goalKm);

  return (
    <Stack gap="8px">
      <HStack justifyContent="space-between" alignItems="baseline">
        <Text fontWeight="medium">
          {number(done, locale)} of {number(goalKm, locale)} km this year
        </Text>
        <Text fontSize="sm" color={projected >= goalKm ? 'green.fg' : 'fg.muted'}>
          On pace for {number(projected, locale)} km
        </Text>
      </HStack>
      <Box position="relative" height="10px" borderRadius="full" background="bg.muted" overflow="hidden">
        <Box height="full" width={`${ratio * 100}%`} background="brand.solid" borderRadius="full" />
        <Box position="absolute" top="0" bottom="0" left={`${elapsed * 100}%`} width="2px" background="fg" opacity={0.5} title="Today" />
      </Box>
    </Stack>
  );
};

const Totals = ({activities, now}: {activities: Activity[]; now: Date}) => {
  const {sports, yearGoalKm, locale, club} = useSettings();
  const {label} = useLabels();
  // Remembered on this device; a sport since taken out of the settings falls back to the first one.
  const [savedSport, setSport] = useLocalStorage<string>('stats-sport', sports[0] ?? 'Ride');
  const sport = ALL === savedSport || sports.includes(savedSport) ? savedSport : (sports[0] ?? 'Ride');
  const [period, setPeriod] = useLocalStorage<Period>('stats-period', 'year');

  const ofSport = useMemo(
    () => (ALL === sport ? activities : activities.filter(({sport_type}) => getTypes(sport).includes(sport_type))),
    [activities, sport],
  );
  const shown = ofSport.filter(({start_date}) => new Date(start_date).getTime() >= startOf(period, now));
  const distance = shown.reduce((sum, {distance}) => sum + distance, 0);
  const time = shown.reduce((sum, {moving_time}) => sum + moving_time, 0);
  const climbing = shown.reduce((sum, {total_elevation_gain}) => sum + total_elevation_gain, 0);
  const longest = shown.reduce((max, {distance}) => Math.max(max, distance), 0);
  const isRide = 'Ride' === sport;
  // Eddington is an all-time figure; the period's own number goes underneath.
  const [eddington, needed] = isRide ? eddingtonNumber(ofSport) : [0, 0];
  const [periodEddington] = isRide && 'all' !== period ? eddingtonNumber(shown) : [eddington];
  const clubRides = null === club ? [] : shown.filter(({name}) => isClubRide(name, club));

  return (
    <Card>
      <Stack gap="20px">
        <HStack justifyContent="space-between" flexWrap="wrap" gap="12px">
          <HStack gap="6px" flexWrap="wrap">
            {[ALL, ...sports].map(name => (
              <Button key={name} size="sm" borderRadius="full" variant={name === sport ? 'solid' : 'outline'} onClick={() => setSport(name)}>
                {ALL === name ? name : `${label(name)} ${name}`}
              </Button>
            ))}
          </HStack>
          <SegmentGroup.Root size="sm" value={period} onValueChange={({value}) => value && setPeriod(value as Period)}>
            <SegmentGroup.Indicator />
            <SegmentGroup.Items items={PERIODS} />
          </SegmentGroup.Root>
        </HStack>
        <Grid templateColumns={{base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)'}} gap={{base: '16px', md: '24px'}}>
          <Figure label="Activities" value={number(shown.length, locale)} />
          <Figure label="Distance" value={km(distance, locale)} hint={0 < shown.length ? `${km(distance / shown.length, locale)} on average` : undefined} />
          <Figure label="Time" value={duration(time)} hint={`${number(time / 86400, locale, 1)} days`} />
          <Figure label="Climbing" value={metres(climbing, locale)} hint={`${number(climbing / 8849, locale, 1)} × Everest`} />
          <Figure label="Longest" value={km(longest, locale)} />
          {0 < time && 0 < distance && <Figure label="Average speed" value={`${number((distance / time) * 3.6, locale, 1)} km/h`} />}
          {isRide && (
            <Figure
              label="Eddington, all time"
              value={`${eddington} km`}
              hint={
                'all' === period
                  ? `${needed} more days of ${eddington + 1} km for the next`
                  : `${periodEddington} km ${'year' === period ? 'this year' : 'over 12 months'} · ${needed} more days of ${eddington + 1} km for the next`
              }
            />
          )}
          {isRide && null !== club && <Figure label={club.name} value={number(clubRides.length, locale)} hint={km(clubRides.reduce((sum, {distance}) => sum + distance, 0), locale)} />}
        </Grid>
        {isRide && <YearGoal rides={ofSport} goalKm={yearGoalKm} now={now} locale={locale} />}
      </Stack>
    </Card>
  );
};

const ChartCard = ({title, children}: {title: string; children: React.ReactNode}) => (
  <Card>
    <CardTitle>{title}</CardTitle>
    <Suspense fallback={<Spinner />}>{children}</Suspense>
  </Card>
);

const StatsPage = () => {
  const {data, isComplete} = useAllActivities();
  const {club} = useSettings();
  const [now] = useState(() => new Date());
  const activities = data ?? [];

  const tabs: {value: string; label: string; charts: [string, React.ReactNode][]}[] = [
    {
      value: 'training',
      label: 'Training',
      charts: [
        ['Power curve', <PowerCurveChart />],
        ['Time in power zones, week by week', <PowerZonesChart />],
        ['Threshold power', <FTPChart />],
        ['Aerobic fitness', <AerobicFitnessChart />],
        ['Heart rate drift on long rides', <HeartRateDriftChart />],
        ['Heart rate and power, ride by ride', <HeartChart />],
        ['Suffer score per period', <TimeframeChart data="suffer_score" formatter={value => value.toFixed(0)} displayTypes={false} />],
        ['Suffer score, ride by ride', <DataLineChart data="suffer_score" />],
        ['Cadence, ride by ride', <DataLineChart min={40} max={110} data="average_cadence" />],
      ],
    },
    {
      value: 'volume',
      label: 'Volume',
      charts: [
        ['Distance', <TimeframeChart data="distance" formatter={value => formatDistance(value, 1)} excludedTypes={[ActivityType.Tennis]} />],
        ['Activities by sport', <ActivityTimeChart />],
        ['Moving time', <TimeframeChart data="moving_time" formatter={formatDuration} />],
        ['How hilly your rides are', <GradesChart />],
        ['Climbing', <TimeframeChart data="total_elevation_gain" formatter={value => formatDistance(value, 1)} type="area" excludedTypes={[ActivityType.Tennis, ActivityType.Swim]} />],
        ['Calories', <TimeframeChart data="kilojoules" formatter={formatCalories} excludedTypes={[ActivityType.Tennis, ActivityType.Swim]} />],
      ],
    },
    {
      value: 'commutes',
      label: 'Commutes',
      charts: [
        ['Routes', <CommuteRoutes />],
        ['Commuting', <TimeframeChart data="distance" formatter={value => formatDistance(value, 1)} filter={{withCommute: 'only'}} displayTypes={false} />],
        ['Commute speed', <CommuteSpeedChart />],
      ],
    },
    {
      value: 'running',
      label: 'Running',
      charts: [['Best times', <RunBestTimes />]],
    },
    {
      value: 'gear',
      label: 'Gear',
      charts: [
        ['Distance per gear', <GearChart data="distance" formatter={value => formatDistance(value, 0)} type="pie" />],
        ['Time per gear', <GearChart data="moving_time" formatter={formatDuration} type="pie" />],
        ['Climbing per gear', <GearChart data="total_elevation_gain" formatter={formatDistanceMeters} type="pie" />],
        ['Average speed per bike', <AverageGearChart />],
      ],
    },
    {
      value: 'eddington',
      label: 'Eddington',
      charts: [
        ['Eddington over time', <EddingtonChart />],
        ['Days over each distance', <EddingtonDayChart />],
      ],
    },
    ...(null === club
      ? []
      : [
          {
            value: 'club',
            label: club.name,
            charts: [
              ['Rides per period', <TimeframeChart filter={{search: club.name}} data={1} displayTypes={false} />],
              ['Speed and power', <ProgressChart search={club.name} />],
              ['Where rides finished', <FinishPieChart club={club} />],
              ['Groups', <NPGroupPieChart club={club} />],
            ] as [string, React.ReactNode][],
          },
        ]),
    {
      value: 'other',
      label: 'Other',
      charts: [
        ['Solo or in a group', <GroupChart />],
        ['Pools', <PoolPieChart />],
        ['Courts', <CourtPieChart />],
      ],
    },
  ];

  return (
    <Stack gap={{base: '16px', md: '24px'}}>
      <Text fontFamily="heading" fontSize={{base: '2xl', md: '3xl'}} fontWeight="bold" letterSpacing="-0.02em">
        Stats
      </Text>
      {!isComplete ? (
        <HStack gap="10px" color="fg.muted">
          <Spinner size="sm" />
          <Text fontSize="sm">Loading all your activities…</Text>
        </HStack>
      ) : (
        <>
          <Totals activities={activities} now={now} />
          <Tabs.Root defaultValue="training" lazyMount={true} unmountOnExit={true} variant="enclosed">
            <Tabs.List overflowX="auto" maxWidth="full">
              {tabs.map(({value, label}) => (
                <Tabs.Trigger key={value} value={value}>
                  {label}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
            {tabs.map(({value, charts}) => (
              <Tabs.Content key={value} value={value}>
                <Grid templateColumns={{base: 'minmax(0, 1fr)', xl: 'repeat(2, minmax(0, 1fr))'}} gap={{base: '16px', md: '24px'}}>
                  {charts.map(([title, chart]) => (
                    <ChartCard key={title} title={title}>
                      {chart}
                    </ChartCard>
                  ))}
                </Grid>
              </Tabs.Content>
            ))}
          </Tabs.Root>
        </>
      )}
    </Stack>
  );
};

export {StatsPage};
