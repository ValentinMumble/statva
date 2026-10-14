import {Suspense, useMemo, useState} from 'react';
import {Badge, Box, Button, Grid, HStack, Icon, Spinner, Stack, Text} from '@chakra-ui/react';
import {Link} from 'react-router';
import {CircleMarker, Tooltip} from 'react-leaflet';
import {LuExternalLink, LuUsers} from 'react-icons/lu';
import {useActivityMeta, useAllActivities, useSettings} from '../../hooks';
import {
  ClubRecord,
  ClubSession,
  clubRecords,
  clubSessions,
  clubTotals,
  clubWeeks,
  decodePolyline,
  formatSpeed,
  groupSize,
  groupStats,
  sessionsHeld,
  startPoints,
} from '../../models';
import {HeartChart, ProgressChart, TimeframeChart} from '../../components/charts/lazy-charts';
import {deviceDay, formatDay, formatDayRange, localDay, weekdayOf} from '../../models/local-day';
import {Card, CardTitle} from '../components/Card';
import {Figure, Panel, Readout} from '../components/Panel';
import {RouteThumb} from '../components/RouteThumb';
import {TrackMap} from '../components/TrackMap';
import {duration, km, metres, number, relativeDay} from '../format';

const LATEST_COUNT = 8;

const recordValue = ({key, value}: ClubRecord, locale: string): string => {
  switch (key) {
    case 'fastest':
      return formatSpeed(value);
    case 'longest':
      return km(value, locale);
    case 'hilliest':
      return metres(value, locale);
    case 'power':
      return `${Math.round(value)} W`;
    case 'coldest':
    case 'hottest':
      return `${number(value, locale)} °C`;
    case 'kudos':
      return `${value} kudos`;
    default:
      return number(value, locale);
  }
};

const dateOf = ({activity}: ClubSession, locale: string): string =>
  new Date(activity.start_date).toLocaleDateString(locale, {day: 'numeric', month: 'short', year: 'numeric'});

/** A row of bars for a few named counts, longest first, sized against the biggest. */
const CountBars = ({rows, unit}: {rows: [string, number][]; unit: string}) => {
  const top = Math.max(1, ...rows.map(([, value]) => value));

  return (
    <Stack gap="8px">
      {rows.map(([name, value]) => (
        <Stack key={name} gap="3px">
          <HStack justifyContent="space-between" fontSize="sm" gap="10px">
            <Text truncate={true}>{name}</Text>
            <Text color="fg.muted" flexShrink={0}>
              {value} {unit}
            </Text>
          </HStack>
          <Box height="6px" borderRadius="full" background="bg.muted" overflow="hidden">
            <Box height="full" width={`${(value / top) * 100}%`} background="brand.solid" borderRadius="full" />
          </Box>
        </Stack>
      ))}
    </Stack>
  );
};

/** One cell per week since the first session, a row per year: filled when there was a session. */
const WeekStrip = ({weeks, locale}: {weeks: ReturnType<typeof clubWeeks>['weeks']; locale: string}) => {
  const years = [...new Set(weeks.map(({start}) => start.slice(0, 4)))];

  return (
    <Stack gap="6px">
      {years.map(year => (
        <HStack key={year} gap="8px" alignItems="flex-start">
          <Text fontSize="xs" color="fg.muted" width="34px" flexShrink={0} lineHeight="12px">
            {year}
          </Text>
          <HStack gap="2px" flexWrap="wrap">
            {weeks
              .filter(({start}) => start.startsWith(year))
              .map(({start, session}) => {
                const cell = (
                  <Box
                    key={start}
                    width="10px"
                    height="12px"
                    borderRadius="2px"
                    background={null === session ? 'bg.muted' : 'brand.solid'}
                    title={null === session ? `Week of ${formatDay(start, locale)}: no session` : `${session.activity.name}, ${dateOf(session, locale)}`}
                  />
                );

                return null === session ? cell : (
                  <Link key={start} to={`/activities/${session.activity.id}`}>
                    {cell}
                  </Link>
                );
              })}
          </HStack>
        </HStack>
      ))}
    </Stack>
  );
};

const SessionRow = ({session, locale, now}: {session: ClubSession; locale: string; now: Date}) => {
  const {activity, group, finish} = session;

  return (
    <Link to={`/activities/${activity.id}`}>
      <HStack gap="14px" padding="8px" marginX="-8px" borderRadius="12px" _hover={{background: 'bg.subtle'}}>
        <RouteThumb activity={activity} />
        <Stack gap="2px" minWidth="0" flex="1">
          <HStack gap="8px" minWidth="0">
            <Text fontWeight="medium" truncate={true}>
              {activity.name}
            </Text>
            {'Unknown' !== group && (
              <Badge size="sm" variant="subtle" flexShrink={0}>
                {group}
              </Badge>
            )}
          </HStack>
          <HStack gap="6px" fontSize="sm" color="fg.muted" minWidth="0">
            <Text truncate={true}>
              {relativeDay(new Date(activity.start_date), locale, now)}
              {null !== finish ? ` · ${finish}` : ''}
            </Text>
            {1 < activity.athlete_count && (
              <HStack gap="4px" flexShrink={0} title={`${activity.athlete_count} riders on Strava`}>
                <Text>·</Text>
                <Icon as={LuUsers} boxSize="12px" />
                <Text>{activity.athlete_count}</Text>
              </HStack>
            )}
          </HStack>
        </Stack>
        <Stack gap="0" alignItems="flex-end" flexShrink={0}>
          <Text fontFamily="figure" fontWeight="semibold">
            {km(activity.distance, locale)}
          </Text>
          <Text fontSize="sm" color="fg.muted">
            {formatSpeed(activity.average_speed)}
          </Text>
        </Stack>
      </HStack>
    </Link>
  );
};

const ChartPanel = ({title, children}: {title: string; children: React.ReactNode}) => (
  <Card>
    <CardTitle>{title}</CardTitle>
    <Suspense fallback={<Spinner />}>{children}</Suspense>
  </Card>
);

/** Everything about the club rides: attendance, groups, records, places and the latest sessions. */
const ClubPage = () => {
  const {data, isComplete} = useAllActivities();
  const {activityMeta} = useActivityMeta();
  const {club, locale, mapCenter} = useSettings();
  const [now] = useState(() => new Date());
  const [showAll, setShowAll] = useState(false);
  const activities = useMemo(() => data ?? [], [data]);

  const sessions = useMemo(() => (null === club ? [] : clubSessions(activities, activityMeta, club)), [activities, activityMeta, club]);
  const year = String(now.getFullYear());
  const thisYear = useMemo(() => sessions.filter(({activity}) => localDay(activity).startsWith(year)), [sessions, year]);
  const totals = clubTotals(sessions, activities);
  const yearTotals = clubTotals(thisYear, activities.filter(activity => localDay(activity).startsWith(year)));
  const held = sessionsHeld(sessions);
  const weeks = useMemo(() => clubWeeks(sessions, deviceDay(now)), [sessions, now]);
  const groups = useMemo(() => groupStats(sessions), [sessions]);
  const size = useMemo(() => groupSize(sessions), [sessions]);
  const records = useMemo(() => clubRecords(sessions), [sessions]);
  const starts = useMemo(() => startPoints(sessions).slice(0, 5), [sessions]);
  const tracks = useMemo(
    () => sessions.map(({activity}) => decodePolyline(activity.map?.summary_polyline ?? '')).filter(track => 0 < track.length),
    [sessions],
  );
  const finishes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const {finish} of sessions) if (null !== finish) counts.set(finish, (counts.get(finish) ?? 0) + 1);

    return [...counts.entries()].sort((first, second) => second[1] - first[1]).slice(0, 10);
  }, [sessions]);

  if (null === club) {
    return (
      <Text color="fg.muted">
        Set your club in <Link to="/settings">Settings</Link> to see its rides here.
      </Text>
    );
  }

  const first = sessions[sessions.length - 1];
  const weekdayCounts = sessions.reduce((counts: number[], {activity}) => {
    counts[weekdayOf(localDay(activity))]++;
    return counts;
  }, Array(7).fill(0));
  const usualWeekday = 0 === sessions.length ? undefined : weekdayCounts.indexOf(Math.max(...weekdayCounts));
  // 2024-01-01 was a Monday.
  const weekdayName = undefined === usualWeekday ? null : new Date(Date.UTC(2024, 0, 1 + usualWeekday)).toLocaleDateString(locale, {weekday: 'long', timeZone: 'UTC'});
  const kudos = sessions.reduce((sum, {activity}) => sum + activity.kudos_count, 0);
  const photos = sessions.reduce((sum, {activity}) => sum + (activity.total_photo_count ?? activity.photo_count ?? 0), 0);
  const prs = sessions.reduce((sum, {activity}) => sum + (activity.pr_count ?? 0), 0);
  const achievements = sessions.reduce((sum, {activity}) => sum + activity.achievement_count, 0);
  const shown = showAll ? sessions : sessions.slice(0, LATEST_COUNT);
  const run = (length: number) => `${length} ${1 === length ? 'week' : 'weeks'}`;

  return (
    <Stack gap={{base: '16px', md: '24px'}}>
      <Stack gap="4px">
        <HStack justifyContent="space-between" alignItems="baseline" gap="12px" flexWrap="wrap">
          <Text fontFamily="heading" fontSize={{base: '2xl', md: '3xl'}} fontWeight="bold" letterSpacing="-0.02em">
            {club.name}
          </Text>
          {club.url && (
            <Button size="sm" variant="outline" asChild={true}>
              <a href={club.url} target="_blank" rel="noreferrer">
                Club site <LuExternalLink />
              </a>
            </Button>
          )}
        </HStack>
        {undefined !== first && (
          <Text color="fg.muted">
            Since {new Date(first.activity.start_date).toLocaleDateString(locale, {month: 'long', year: 'numeric'})}
            {null !== weekdayName ? `, usually on ${weekdayName}` : ''}
          </Text>
        )}
      </Stack>

      {!isComplete ? (
        <HStack gap="10px" color="fg.muted">
          <Spinner size="sm" />
          <Text fontSize="sm">Loading all your activities…</Text>
        </HStack>
      ) : 0 === sessions.length ? (
        <Text color="fg.muted">No ride has "{club.name}" in its name yet.</Text>
      ) : (
        <>
          <Grid templateColumns={{base: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))', xl: 'repeat(6, minmax(0, 1fr))'}} gap="12px">
            <Readout value={number(totals.sessions, locale)} caption={null === held ? 'sessions' : `sessions, of ${number(held.held, locale)} the club ran`} />
            <Readout value={number(totals.distance / 1000, locale)} unit="km" caption={`${number(totals.share * 100, locale)}% of your riding`} />
            <Readout value={number(totals.elevation, locale)} unit="m" caption="climbed" />
            <Readout value={duration(totals.time)} caption="in the saddle" />
            <Readout value={number(yearTotals.sessions, locale)} caption={`sessions in ${year}`} />
            <Readout value={number(yearTotals.distance / 1000, locale)} unit="km" caption={`in ${year}, ${number(yearTotals.share * 100, locale)}% of your riding`} />
          </Grid>

          <Panel title="Attendance" note="weeks from Monday">
            <Grid templateColumns={{base: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))'}} gap="16px">
              <Figure value={run(weeks.current.length)} caption="in a row now" detail={null === weeks.current.from ? 'none going' : `since the week of ${formatDay(weeks.current.from, locale)}`} />
              <Figure value={run(weeks.longest.length)} caption="longest run" detail={null === weeks.longest.from || null === weeks.longest.to ? undefined : formatDayRange(weeks.longest.from, weeks.longest.to, locale)} />
              <Figure value={`${weeks.missedRecently} of 8`} caption="weeks missed lately" />
            </Grid>
            <WeekStrip weeks={weeks.weeks} locale={locale} />
          </Panel>

          <Card>
            <CardTitle>Sessions</CardTitle>
            <Stack gap="4px">
              {shown.map(session => (
                <SessionRow key={session.activity.id} session={session} locale={locale} now={now} />
              ))}
            </Stack>
            {LATEST_COUNT < sessions.length && (
              <Button size="sm" variant="ghost" marginTop="8px" onClick={() => setShowAll(!showAll)}>
                {showAll ? 'Show fewer' : `Show all ${sessions.length}`}
              </Button>
            )}
          </Card>

          <Grid templateColumns={{base: 'minmax(0, 1fr)', lg: 'repeat(2, minmax(0, 1fr))'}} gap={{base: '16px', md: '24px'}}>
            <Panel title="Groups" note="power from rides with a power meter">
              <Stack gap="10px">
                {groups.map(group => (
                  <HStack key={group.name} justifyContent="space-between" gap="12px" fontSize="sm">
                    <Stack gap="0" minWidth="0">
                      <Text fontWeight="medium" truncate={true}>
                        {group.name}
                      </Text>
                      <Text color="fg.muted">
                        {group.sessions} {1 === group.sessions ? 'session' : 'sessions'}
                        {null !== group.riders ? ` · ${number(group.riders, locale)} riders on average` : ''}
                      </Text>
                    </Stack>
                    <Stack gap="0" alignItems="flex-end" flexShrink={0}>
                      <Text fontFamily="figure" fontWeight="semibold">
                        {formatSpeed(group.speed)}
                      </Text>
                      <Text color="fg.muted">{null === group.power ? '—' : `${Math.round(group.power)} W`}</Text>
                    </Stack>
                  </HStack>
                ))}
              </Stack>
            </Panel>

            <Panel title="Group size" note="riders Strava matched on the same ride">
              <Grid templateColumns="repeat(2, minmax(0, 1fr))" gap="16px">
                <Figure value={null === size.average ? '—' : number(size.average, locale, 1)} caption="riders on average" />
                <Figure
                  value={null === size.biggest ? '—' : String(size.biggest.activity.athlete_count)}
                  caption="biggest ride"
                  detail={null === size.biggest ? undefined : dateOf(size.biggest, locale)}
                />
              </Grid>
              <HStack gap="4px" alignItems="flex-end" height="80px">
                {size.byMonth.map((riders, month) => {
                  const top = Math.max(1, ...size.byMonth.map(value => value ?? 0));
                  const name = new Date(Date.UTC(2024, month, 1)).toLocaleDateString(locale, {month: 'short', timeZone: 'UTC'});

                  return (
                    <Stack key={month} gap="2px" flex="1" alignItems="center" height="full" justifyContent="flex-end" title={null === riders ? `${name}: no data` : `${name}: ${number(riders, locale, 1)} riders`}>
                      <Box width="full" height={`${((riders ?? 0) / top) * 100}%`} minHeight={null === riders ? '0' : '2px'} background="brand.solid" borderRadius="3px 3px 0 0" />
                      <Text fontSize="2xs" color="fg.muted">
                        {name.slice(0, 1).toUpperCase()}
                      </Text>
                    </Stack>
                  );
                })}
              </HStack>
            </Panel>

            <Panel title="Session records">
              <Stack gap="8px">
                {records.map(record => (
                  <Link key={record.key} to={`/activities/${record.session.activity.id}`}>
                    <HStack justifyContent="space-between" gap="12px" fontSize="sm" _hover={{color: 'brand.fg'}}>
                      <Stack gap="0" minWidth="0">
                        <Text fontWeight="medium">{record.heading}</Text>
                        <Text color="fg.muted" truncate={true}>
                          {record.session.activity.name} · {dateOf(record.session, locale)}
                        </Text>
                      </Stack>
                      <Text fontFamily="figure" fontWeight="semibold" flexShrink={0}>
                        {recordValue(record, locale)}
                      </Text>
                    </HStack>
                  </Link>
                ))}
              </Stack>
              <Grid templateColumns="repeat(2, minmax(0, 1fr))" gap="16px" marginTop="8px">
                <Figure value={number(prs, locale)} caption="personal records" />
                <Figure value={number(achievements, locale)} caption="achievements" />
                <Figure value={number(kudos, locale)} caption="kudos" detail={`${number(kudos / sessions.length, locale, 1)} per session`} />
                <Figure value={number(photos, locale)} caption="photos" />
              </Grid>
            </Panel>

            <Panel title="Where it finished" note="from ride notes">
              {0 === finishes.length ? (
                <Text fontSize="sm" color="fg.muted">
                  Write "Finish au …" in a ride's notes to see where sessions end.
                </Text>
              ) : (
                <CountBars rows={finishes} unit="visits" />
              )}
            </Panel>
          </Grid>

          <Panel title="Routes" note={`${tracks.length} sessions, and where they start`}>
            <TrackMap tracks={tracks} center={mapCenter} showEnds={false} height={{base: '320px', md: '460px'}}>
              {starts.map(({point, sessions: count}) => (
                <CircleMarker key={point.join(',')} center={point} radius={5 + Math.min(10, count / 4)} pathOptions={{color: 'white', weight: 2, fillColor: '#111', fillOpacity: 0.9}}>
                  <Tooltip>
                    {count} {1 === count ? 'start' : 'starts'}
                  </Tooltip>
                </CircleMarker>
              ))}
            </TrackMap>
          </Panel>

          <Grid templateColumns={{base: 'minmax(0, 1fr)', xl: 'repeat(2, minmax(0, 1fr))'}} gap={{base: '16px', md: '24px'}}>
            <ChartPanel title="Sessions per period">
              <TimeframeChart filter={{search: club.name}} data={1} displayTypes={false} />
            </ChartPanel>
            <ChartPanel title="Speed and power">
              <ProgressChart search={club.name} />
            </ChartPanel>
            <ChartPanel title="Heart rate and power">
              <HeartChart search={club.name} />
            </ChartPanel>
          </Grid>
        </>
      )}
    </Stack>
  );
};

export {ClubPage};
