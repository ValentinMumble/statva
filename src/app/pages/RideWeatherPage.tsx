import {useMemo, useState} from 'react';
import {Button, Field, Grid, HStack, Input, NativeSelect, SegmentGroup, Spinner, Stack, Text} from '@chakra-ui/react';
import {useQuery} from '@tanstack/react-query';
import {LuCopy, LuSend, LuShare2} from 'react-icons/lu';
import {useLocalStorage} from 'usehooks-ts';
import {KomootTourSummary, SharedRide, StravaRoute, UnknownLinkError} from '../../api';
import {Slider, toaster} from '../../components/ui';
import {useAllActivities, useSession, useSettings} from '../../hooks';
import {getFetcher} from '../../hooks/useFetcher';
import {climbing, FORECAST_DAYS, PlannedRoute, usualPace} from '../../models';
import {deviceDay} from '../../models/local-day';
import {Card} from '../components/Card';
import {RideWeatherResults} from '../components/RideWeatherResults';
import {km, number} from '../format';

const fetchStravaRoutes = getFetcher<StravaRoute[]>('routes.strava');
const fetchStravaRoute = getFetcher<PlannedRoute>('route.strava');
const fetchKomootTour = getFetcher<PlannedRoute>('route.komoot');
const fetchKomootTours = getFetcher<KomootTourSummary[]>('komoot.tours');
const fetchKomootSavedTour = getFetcher<PlannedRoute>('komoot.tour');
const shareRide = getFetcher<string>('ride.share');

type Source = 'strava' | 'komoot';
// The speeds the slider offers (km/h).
const SPEEDS = {min: 10, max: 45, step: 0.5};
// The Komoot choice meaning "the tour from the link pasted" rather than a saved one.
const KOMOOT_LINK = 'link';

const DAY_MS = 86400000;

/** The next full hour, as the start the page offers first. */
const nextHour = (): Date => {
  const date = new Date(Date.now() + 3600000);
  date.setMinutes(0, 0, 0);
  return date;
};

/**
 * The link to a shared ride, to copy or send. Sending opens the phone's share sheet: a fresh
 * tap, as browsers only open it right after one.
 */
const ShareLink = ({url, title}: {url: string; title: string}) => {
  const copy = async () => {
    await navigator.clipboard.writeText(url);
    toaster.create({title: 'Link copied'});
  };
  const send = async () => {
    try {
      await navigator.share({url, title});
    } catch {
      // Closed without sending.
    }
  };

  return (
    <Stack gap="6px">
      <HStack width="full">
        <Input value={url} readOnly={true} onFocus={({target}) => target.select()} />
        <Button variant="outline" onClick={copy}>
          <LuCopy /> Copy
        </Button>
        {'share' in navigator && (
          <Button colorPalette="brand" onClick={send}>
            <LuSend /> Send
          </Button>
        )}
      </HStack>
      <Text fontSize="xs" color="fg.muted">
        Anyone with the link sees this ride for 30 days, with a fresh forecast, without logging in.
      </Text>
    </Stack>
  );
};

/**
 * The weather on a planned ride, as Epic Ride Weather shows it: a Strava route or a Komoot
 * tour, ridden at the rider's own pace from a start time, with the forecast at each part of
 * the route when they get there, and the wind as head or tail wind. Share makes a link.
 */
const RideWeatherPage = () => {
  const {locale} = useSettings();
  const {athleteId, isDemo} = useSession();
  const {data: activities} = useAllActivities();
  const [source, setSource] = useLocalStorage<Source>('ride-weather-source', 'strava');
  const [stravaId, setStravaId] = useLocalStorage<string>('ride-weather-strava-route', '');
  const [komootLink, setKomootLink] = useLocalStorage<string>('ride-weather-komoot-link', '');
  const [komootChoice, setKomootChoice] = useLocalStorage<string>('ride-weather-komoot-tour', '');
  const [linkDraft, setLinkDraft] = useState(komootLink);
  const [first] = useState(nextHour);
  const [startDay, setStartDay] = useState(deviceDay(first));
  const [startTime, setStartTime] = useState(`${String(first.getHours()).padStart(2, '0')}:00`);
  // The average speed picked on the slider, or null for the rider's own.
  const [speed, setSpeed] = useState<number | null>(null);
  const [sharing, setSharing] = useState(false);
  // The link made, with what it was made of: a change to the ride hides it.
  const [shared, setShared] = useState<{url: string; ride: string} | null>(null);

  const routes = useQuery({
    queryKey: ['stravaRoutes'],
    queryFn: () => fetchStravaRoutes(athleteId),
    enabled: 'strava' === source && null !== athleteId,
  });
  const stravaRoute = routes.data?.find(({id_str}) => id_str === stravaId) ?? routes.data?.[0];
  // The rider's planned tours, when the owner set the Komoot login; a pasted link otherwise.
  const komootTours = useQuery({
    queryKey: ['komootTours'],
    queryFn: fetchKomootTours,
    enabled: 'komoot' === source,
    retry: false,
    staleTime: 10 * 60000,
  });
  const savedTours = komootTours.data ?? [];
  const komootTour =
    KOMOOT_LINK === komootChoice
      ? null
      : (savedTours.find(({id}) => String(id) === komootChoice) ?? savedTours[0] ?? null);
  const route = useQuery({
    queryKey: ['plannedRoute', source, 'strava' === source ? stravaRoute?.id_str : (komootTour?.id ?? komootLink)],
    queryFn: () =>
      'strava' === source
        ? fetchStravaRoute(stravaRoute)
        : null !== komootTour
          ? fetchKomootSavedTour(komootTour.id)
          : fetchKomootTour(komootLink),
    enabled: 'strava' === source ? undefined !== stravaRoute : null !== komootTour || '' !== komootLink,
    staleTime: Infinity,
    retry: false,
  });

  const points = useMemo(() => route.data?.points ?? [], [route.data]);
  const distance = points.at(-1)?.distance ?? 0;
  const [now] = useState(() => new Date());
  const usual = useMemo(() => usualPace(activities ?? [], distance, now), [activities, distance, now]);
  const climb = useMemo(() => climbing(points), [points]);
  // The rider's own pace (25 km/h without enough rides), and their average speed on this route.
  const ownPace = usual ?? {secondsPerMetre: 3.6 / 25, secondsPerMetreClimbed: 0};
  const ownTime = distance * ownPace.secondsPerMetre + climb * ownPace.secondsPerMetreClimbed;
  const ownSpeed = 0 < ownTime ? (distance / ownTime) * 3.6 : 25;
  // An average speed picked on the slider scales the whole ride to it, still slower on the climbs.
  const average = speed ?? ownSpeed;
  const scale = ownSpeed / average;
  const pace = useMemo(
    () => ({
      secondsPerMetre: ownPace.secondsPerMetre * scale,
      secondsPerMetreClimbed: ownPace.secondsPerMetreClimbed * scale,
    }),
    [ownPace.secondsPerMetre, ownPace.secondsPerMetreClimbed, scale],
  );
  const start = new Date(`${startDay}T${startTime}`).getTime();
  const rideKey = JSON.stringify([route.data?.name, distance, start, pace]);

  const share = async () => {
    if (undefined === route.data) return;
    setSharing(true);
    try {
      const id = await shareRide({route: route.data, start, pace} satisfies SharedRide);
      setShared({url: `${window.location.origin}/w/${id}`, ride: rideKey});
    } catch {
      toaster.create({title: 'The link could not be made', description: 'Try again in a moment.'});
    } finally {
      setSharing(false);
    }
  };

  return (
    <Stack gap={{base: '16px', md: '24px'}}>
      <HStack justifyContent="space-between" alignItems="center" gap="12px">
        <Text fontFamily="heading" fontSize={{base: '2xl', md: '3xl'}} fontWeight="bold" letterSpacing="-0.02em">
          Ride weather
        </Text>
        {/* The demo keeps nothing on a server, so it has no links to give. */}
        {!isDemo && undefined !== route.data && 1 < points.length && (
          <Button variant="outline" size="sm" onClick={share} loading={sharing} loadingText="Making the link">
            <LuShare2 /> Share
          </Button>
        )}
      </HStack>

      {null !== shared && rideKey === shared.ride && (
        <ShareLink url={shared.url} title={`${route.data?.name}: the ride weather`} />
      )}

      <Card>
        <Stack gap="16px">
          <SegmentGroup.Root
            size="sm"
            value={source}
            onValueChange={({value}) => setSource(value as Source)}
            alignSelf="flex-start"
          >
            <SegmentGroup.Indicator />
            <SegmentGroup.Items
              items={[
                {value: 'strava', label: 'Strava route'},
                {value: 'komoot', label: 'Komoot tour'},
              ]}
            />
          </SegmentGroup.Root>

          {'strava' === source ? (
            null === athleteId ? (
              <Text color="fg.muted">The demo has no Strava routes: try a Komoot tour.</Text>
            ) : routes.isError ? (
              <Text color="fg.error">
                Strava could not list your routes. Log out and in again to let Statva read your private routes.
              </Text>
            ) : (
              <Field.Root>
                <Field.Label>Route</Field.Label>
                <NativeSelect.Root disabled={!routes.data}>
                  <NativeSelect.Field
                    value={stravaRoute?.id_str ?? ''}
                    onChange={({target}) => setStravaId(target.value)}
                  >
                    {0 === routes.data?.length && <option value="">No saved routes on Strava</option>}
                    {routes.data?.map(({id_str, name, distance: length}) => (
                      <option key={id_str} value={id_str}>
                        {name} · {km(length, locale)}
                      </option>
                    ))}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Field.Root>
            )
          ) : (
            <Stack gap="12px">
              {0 < savedTours.length && (
                <Field.Root>
                  <Field.Label>Tour</Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      value={null === komootTour ? KOMOOT_LINK : String(komootTour.id)}
                      onChange={({target}) => setKomootChoice(target.value)}
                    >
                      {savedTours.map(({id, name, distance: length}) => (
                        <option key={id} value={String(id)}>
                          {name} · {km(length, locale)}
                        </option>
                      ))}
                      <option value={KOMOOT_LINK}>Paste a link…</option>
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                </Field.Root>
              )}
              {null === komootTour && (
                <Field.Root>
                  <Field.Label>Komoot link</Field.Label>
                  <HStack width="full">
                    <Input
                      value={linkDraft}
                      placeholder="https://www.komoot.com/tour/…"
                      onChange={({target}) => setLinkDraft(target.value)}
                      onKeyDown={({key}) => 'Enter' === key && setKomootLink(linkDraft.trim())}
                    />
                    <Button onClick={() => setKomootLink(linkDraft.trim())} disabled={'' === linkDraft.trim()}>
                      Load
                    </Button>
                  </HStack>
                  <Field.HelperText>
                    A public tour, or a private one through the link its Share button gives.
                  </Field.HelperText>
                </Field.Root>
              )}
            </Stack>
          )}

          <Grid templateColumns={{base: '1fr 1fr', md: 'repeat(3, 1fr)'}} gap="12px">
            <Field.Root>
              <Field.Label>Day</Field.Label>
              <Input
                type="date"
                value={startDay}
                max={deviceDay(new Date(now.getTime() + (FORECAST_DAYS - 1) * DAY_MS))}
                onChange={({target}) => setStartDay(target.value)}
              />
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
                {null === usual ? 'Not enough rides to know your pace: 25 km/h until you pick one. ' : ''}
                Slower on the climbs, faster elsewhere.{' '}
                {null !== speed && (
                  <Button variant="plain" size="xs" height="auto" padding="0" onClick={() => setSpeed(null)}>
                    Back to yours ({number(ownSpeed, locale, 1)} km/h)
                  </Button>
                )}
              </Field.HelperText>
            </Field.Root>
          </Grid>
        </Stack>
      </Card>

      {route.isFetching && <Spinner alignSelf="center" />}
      {route.isError && (
        <Text color="fg.error">
          {route.error instanceof UnknownLinkError
            ? 'That is not a Komoot tour link.'
            : 'The route could not be loaded. A private Komoot tour needs the link from its Share button.'}
        </Text>
      )}

      {undefined !== route.data && 1 < points.length && !Number.isNaN(start) && (
        <RideWeatherResults route={route.data} start={start} pace={pace} locale={locale} />
      )}
    </Stack>
  );
};

export {RideWeatherPage};
