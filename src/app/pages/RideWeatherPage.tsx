import {useEffect, useMemo, useState} from 'react';
import {
  Button,
  Field,
  HStack,
  IconButton,
  Input,
  NativeSelect,
  SegmentGroup,
  Spinner,
  Stack,
  Text,
} from '@chakra-ui/react';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {Link, useSearchParams} from 'react-router';
import {LuArrowLeft, LuShare2, LuX} from 'react-icons/lu';
import {SiKomoot, SiStrava} from 'react-icons/si';
import {useLocalStorage} from 'usehooks-ts';
import {KomootTourSummary, RideBookmark, SharedRide, StravaRoute, UnknownLinkError} from '../../api';
import {toaster} from '../../components/ui';
import {useAllActivities, useSession, useSettings} from '../../hooks';
import {getFetcher} from '../../hooks/useFetcher';
import {useRideTiming} from '../../hooks/useRideTiming';
import {getTypes, PlannedRoute, usualPace} from '../../models';
import {Activity, ActivityType} from '../../models/strava';
import {Card} from '../components/Card';
import {RideTimingFields} from '../components/RideTimingFields';
import {RideWeatherResults} from '../components/RideWeatherResults';
import {ShareLink} from '../components/ShareLink';
import {SharedRideWeather} from './SharedRidePage';
import {km} from '../format';

const fetchStravaRoutes = getFetcher<StravaRoute[]>('routes.strava');
const fetchStravaRoute = getFetcher<PlannedRoute>('route.strava');
const fetchKomootTour = getFetcher<PlannedRoute>('route.komoot');
const fetchKomootTours = getFetcher<KomootTourSummary[]>('komoot.tours');
const fetchKomootSavedTour = getFetcher<PlannedRoute>('komoot.tour');
const shareRide = getFetcher<string>('ride.share');
const fetchBookmarks = getFetcher<RideBookmark[]>('ride.bookmarks');
const bookmarkRide = getFetcher<void>('ride.bookmark');
const unbookmarkRide = getFetcher<void>('ride.unbookmark');
const fetchSharedRide = getFetcher<SharedRide>('ride.shared');
const RIDE_TYPES: string[] = getTypes(ActivityType.Ride);

/** The rider's rides, to grade a route's climbing against. */
const useRides = (): Activity[] => {
  const {data: activities} = useAllActivities();
  return useMemo(() => (activities ?? []).filter(({sport_type}) => RIDE_TYPES.includes(sport_type)), [activities]);
};

type Source = 'strava' | 'komoot';
// The two services' own colours, for their logos.
const STRAVA_ORANGE = '#fc4c02';
const KOMOOT_GREEN = '#6aa127';
// The Komoot choice meaning "the tour from the link pasted" rather than a saved one.
const KOMOOT_LINK = 'link';

/**
 * The shared rides the rider bookmarked, soonest first, each opening here (?ride=<id>), the one
 * open marked. A link with ?bookmark=<id> adds one, then leaves the address.
 */
const UpcomingRides = ({locale, openId = null}: {locale: string; openId?: string | null}) => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const adding = searchParams.get('bookmark');
  const bookmarks = useQuery({queryKey: ['rideBookmarks'], queryFn: fetchBookmarks});

  useEffect(() => {
    if (null === adding) return;
    setSearchParams({}, {replace: true});
    const add = async () => {
      try {
        await bookmarkRide(adding);
        toaster.create({title: 'Ride bookmarked'});
      } catch (error) {
        toaster.create({title: 'The ride could not be bookmarked', description: (error as Error).message});
      }
      await queryClient.invalidateQueries({queryKey: ['rideBookmarks']});
    };
    void add();
  }, [adding, setSearchParams, queryClient]);

  const remove = async (id: string) => {
    queryClient.setQueryData<RideBookmark[]>(['rideBookmarks'], rides => rides?.filter(ride => ride.id !== id));
    await unbookmarkRide(id);
  };

  if (!bookmarks.data?.length) return null;

  return (
    <Card>
      <Text fontSize="xs" color="fg.muted" textTransform="uppercase" letterSpacing="0.06em" marginBottom="8px">
        Upcoming rides
      </Text>
      <Stack gap="2px">
        {bookmarks.data.map(({id, name, start, distance}) => (
          <HStack key={id} gap="8px" justifyContent="space-between">
            <Link to={`/weather?ride=${id}`} style={{flex: 1, minWidth: 0}} aria-current={id === openId}>
              <HStack
                gap="12px"
                padding="6px 8px"
                marginX="-8px"
                borderRadius="10px"
                background={id === openId ? 'bg.subtle' : undefined}
                _hover={{background: 'bg.subtle'}}
              >
                <Text fontWeight="semibold" truncate>
                  {name}
                </Text>
                <Text color="fg.muted" fontSize="sm" whiteSpace="nowrap">
                  {new Date(start).toLocaleString(locale, {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {' · '}
                  {km(distance, locale)}
                </Text>
              </HStack>
            </Link>
            <IconButton
              aria-label={`Remove ${name} from the bookmarks`}
              size="xs"
              variant="ghost"
              onClick={() => void remove(id)}
            >
              <LuX />
            </IconButton>
          </HStack>
        ))}
      </Stack>
    </Card>
  );
};

/**
 * A bookmarked ride, opened here rather than on its shared page: with its own day, start,
 * speed and stops to change, and the way back to the rider's routes.
 */
const BookmarkedRideWeather = ({id}: {id: string}) => {
  const {locale} = useSettings();
  const rides = useRides();
  const queryClient = useQueryClient();
  const shared = useQuery({
    queryKey: ['sharedRide', id],
    queryFn: () => fetchSharedRide(id),
    retry: false,
    staleTime: Infinity,
  });
  // Changes made here are saved to the link: the next visit reads it again.
  useEffect(() => () => queryClient.removeQueries({queryKey: ['sharedRide', id]}), [id, queryClient]);

  return (
    <Stack gap={{base: '16px', md: '24px'}}>
      <HStack justifyContent="space-between" alignItems="center" gap="12px">
        <Text fontFamily="heading" fontSize={{base: '2xl', md: '3xl'}} fontWeight="bold" letterSpacing="-0.02em">
          Ride weather
        </Text>
        <Button variant="ghost" size="sm" asChild={true}>
          <Link to="/weather">
            <LuArrowLeft /> Your routes
          </Link>
        </Button>
      </HStack>
      <UpcomingRides locale={locale} openId={id} />
      {shared.isPending && <Spinner alignSelf="center" />}
      {shared.isError && <Text color="fg.muted">This ride is not shared any more: links last 15 days.</Text>}
      {undefined !== shared.data && (
        <SharedRideWeather key={id} shared={shared.data} locale={locale} rides={rides} shareId={id} />
      )}
    </Stack>
  );
};

/**
 * The weather on a planned ride, as Epic Ride Weather shows it: a Strava route or a Komoot
 * tour, ridden at the rider's own pace from a start time, with the forecast at each part of
 * the route when they get there, and the wind as head or tail wind. Share makes a link.
 */
const PlannedRideWeather = () => {
  const {locale} = useSettings();
  const rides = useRides();
  const {athleteId, isDemo} = useSession();
  const {data: activities} = useAllActivities();
  const [source, setSource] = useLocalStorage<Source>('ride-weather-source', 'strava');
  const [stravaId, setStravaId] = useLocalStorage<string>('ride-weather-strava-route', '');
  const [komootLink, setKomootLink] = useLocalStorage<string>('ride-weather-komoot-link', '');
  const [komootChoice, setKomootChoice] = useLocalStorage<string>('ride-weather-komoot-tour', '');
  const [linkDraft, setLinkDraft] = useState(komootLink);
  const [sharing, setSharing] = useState(false);
  const queryClient = useQueryClient();
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
  // The rider's own pace, 25 km/h without enough rides; the day, start and speed on top of it.
  const timing = useRideTiming(route.data, usual ?? {secondsPerMetre: 3.6 / 25, secondsPerMetreClimbed: 0});
  // The route as shown: the way it was planned, or the other way round.
  const {pace, start, route: ridden} = timing;
  const rideKey = JSON.stringify([ridden?.name, distance, start, pace, timing.stopSeconds]);

  // Makes a link for the ride as shown, and keeps it with what it was made of.
  const makeLink = async (): Promise<string> => {
    if (undefined === ridden) throw new Error('No route');
    const id = await shareRide({route: ridden, start, pace, stops: timing.stopSeconds} satisfies SharedRide);
    const url = `${window.location.origin}/w/${id}`;
    setShared({url, ride: rideKey});
    // The server bookmarks the rider's own shares.
    await queryClient.invalidateQueries({queryKey: ['rideBookmarks']});
    return url;
  };
  const share = async () => {
    setSharing(true);
    try {
      await makeLink();
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

      {null !== shared && (
        <ShareLink
          url={shared.url}
          title={`${ridden?.name}: the ride weather`}
          stale={rideKey !== shared.ride}
          renew={makeLink}
        />
      )}

      <UpcomingRides locale={locale} />

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
                {
                  value: 'strava',
                  label: (
                    <HStack gap="6px">
                      <SiStrava color={STRAVA_ORANGE} /> Strava route
                    </HStack>
                  ),
                },
                {
                  value: 'komoot',
                  label: (
                    <HStack gap="6px">
                      <SiKomoot color={KOMOOT_GREEN} /> Komoot tour
                    </HStack>
                  ),
                },
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

          <RideTimingFields
            timing={timing}
            locale={locale}
            ownLabel="yours"
            note={null === usual ? 'Not enough rides to know your pace: 25 km/h until you pick one. ' : undefined}
          />
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

      {undefined !== ridden && 1 < points.length && !Number.isNaN(start) && (
        <RideWeatherResults
          route={ridden}
          start={start}
          pace={pace}
          locale={locale}
          stops={timing.stopSeconds}
          rides={rides}
        />
      )}
    </Stack>
  );
};

/** Ride weather: the rider's own routes, or a bookmarked ride (?ride=<id>). */
const RideWeatherPage = () => {
  const [searchParams] = useSearchParams();
  const rideId = searchParams.get('ride');

  return null === rideId ? <PlannedRideWeather /> : <BookmarkedRideWeather id={rideId} />;
};

export {RideWeatherPage};
