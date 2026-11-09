import {useState} from 'react';
import {Box, Button, Center, HStack, Spinner, Stack, Text} from '@chakra-ui/react';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {LuStar} from 'react-icons/lu';
import {useParams} from 'react-router';
import {bookmarkRide, fetchBookmarks, SharedRide, unbookmarkRide} from '../../api';
import {PageTitle} from '../../components';
import {getFetcher} from '../../hooks/useFetcher';
import {useRideTiming} from '../../hooks/useRideTiming';
import {Card} from '../components/Card';
import {RideTimingFields} from '../components/RideTimingFields';
import {RideWeatherResults} from '../components/RideWeatherResults';

const fetchSharedRide = getFetcher<SharedRide>('ride.shared');
// Statva's own address, where the rider is logged in: this page may live on another one.
const APP_ORIGIN = import.meta.env.VITE_APP_ORIGIN || window.location.origin;

/**
 * Bookmarks this ride for the rider's Ride weather, or takes it out. Only shown when Statva
 * answers that someone is logged in on this browser: a friend opening the link never sees it.
 */
const BookmarkButton = ({shareId}: {shareId: string}) => {
  const queryClient = useQueryClient();
  const bookmarks = useQuery({queryKey: ['shareBookmarks'], queryFn: () => fetchBookmarks(APP_ORIGIN), retry: false});
  if (undefined === bookmarks.data) return null;

  const bookmarked = bookmarks.data.some(({id}) => id === shareId);
  const toggle = async () => {
    await (bookmarked ? unbookmarkRide(shareId, APP_ORIGIN) : bookmarkRide(shareId, APP_ORIGIN));
    await queryClient.invalidateQueries({queryKey: ['shareBookmarks']});
  };

  return (
    <Button variant="outline" size="sm" onClick={() => void toggle()} aria-pressed={bookmarked}>
      <LuStar fill={bookmarked ? 'currentColor' : 'none'} /> {bookmarked ? 'Bookmarked' : 'Bookmark'}
    </Button>
  );
};

/**
 * The shared ride, with its day, start and speed to change here: they start as shared, and
 * a change stays on this page, never in the link.
 */
const SharedRideWeather = ({
  shared,
  locale,
  onSky,
}: {
  shared: SharedRide;
  locale: string;
  onSky: (sky: string | null) => void;
}) => {
  const timing = useRideTiming(shared.route, shared.pace, shared.start, shared.stops ?? null);

  return (
    <>
      <Card>
        <RideTimingFields timing={timing} locale={locale} ownLabel="the shared speed" />
      </Card>
      {!Number.isNaN(timing.start) && (
        <RideWeatherResults
          route={timing.route ?? shared.route}
          start={timing.start}
          pace={timing.pace}
          locale={locale}
          stops={timing.stopSeconds}
          onSky={onSky}
        />
      )}
    </>
  );
};

/**
 * A ride shared from Ride weather, for anyone with its link, with no login: the route, start
 * and pace the rider chose, with the forecast fetched fresh here.
 */
const SharedRidePage = () => {
  const {shareId = ''} = useParams();
  const shared = useQuery({
    queryKey: ['sharedRide', shareId],
    queryFn: () => fetchSharedRide(shareId),
    retry: false,
    staleTime: Infinity,
  });
  // The ride's weather as an emoji, once its forecast is in.
  const [sky, setSky] = useState<string | null>(null);
  const name = shared.data?.route.name;
  const title = undefined === name ? 'Ride weather' : `${null === sky ? '' : `${sky} `}${name}`;

  return (
    <Box maxWidth="1400px" marginX="auto" paddingX={{base: '16px', md: '32px'}} paddingY={{base: '16px', md: '32px'}}>
      {/* The tab, and a bookmark, show the ride's name and its weather. */}
      <PageTitle title={title} />
      <Stack gap={{base: '16px', md: '24px'}}>
        <HStack justifyContent="space-between" alignItems="center" gap="12px">
          <Text fontFamily="heading" fontSize={{base: '2xl', md: '3xl'}} fontWeight="bold" letterSpacing="-0.02em">
            {title}
          </Text>
          {undefined !== shared.data && <BookmarkButton shareId={shareId} />}
        </HStack>
        {shared.isPending && (
          <Center paddingY="48px">
            <Spinner />
          </Center>
        )}
        {shared.isError && (
          <Text color="fg.muted">This ride is not shared any more: links last 15 days. Ask for a new one.</Text>
        )}
        {undefined !== shared.data && (
          <SharedRideWeather shared={shared.data} locale={navigator.language} onSky={setSky} />
        )}
      </Stack>
    </Box>
  );
};

export {SharedRidePage};
