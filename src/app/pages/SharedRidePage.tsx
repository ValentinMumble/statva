import {useState} from 'react';
import {Box, Button, Center, HStack, Spinner, Stack, Text} from '@chakra-ui/react';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {LuArrowLeft, LuStar} from 'react-icons/lu';
import {Link, useParams} from 'react-router';
import {bookmarkRide, fetchBookmarks, SharedRide, unbookmarkRide} from '../../api';
import {PageTitle} from '../../components';
import {getFetcher} from '../../hooks/useFetcher';
import {useRideTiming} from '../../hooks/useRideTiming';
import {Card} from '../components/Card';
import {RideTimingFields} from '../components/RideTimingFields';
import {RideWeatherResults} from '../components/RideWeatherResults';

const fetchSharedRide = getFetcher<SharedRide>('ride.shared');
// English words, dates as day, month, year and a 24-hour clock, whoever opens the link.
const SHARED_LOCALE = 'en-GB';

/**
 * For the rider logged in on this browser, a way back to Ride weather and a button that
 * bookmarks this ride there, or takes it out. A friend opening the link sees neither: their
 * bookmarks never load.
 */
const RiderActions = ({shareId}: {shareId: string}) => {
  const queryClient = useQueryClient();
  const bookmarks = useQuery({queryKey: ['shareBookmarks'], queryFn: () => fetchBookmarks(), retry: false});
  if (undefined === bookmarks.data) return null;

  const bookmarked = bookmarks.data.some(({id}) => id === shareId);
  const toggle = async () => {
    await (bookmarked ? unbookmarkRide(shareId) : bookmarkRide(shareId));
    await queryClient.invalidateQueries({queryKey: ['shareBookmarks']});
    await queryClient.invalidateQueries({queryKey: ['rideBookmarks']});
  };

  return (
    <HStack gap="8px">
      <Button variant="ghost" size="sm" asChild={true}>
        <Link to="/weather">
          <LuArrowLeft /> Ride weather
        </Link>
      </Button>
      <Button variant="outline" size="sm" onClick={() => void toggle()} aria-pressed={bookmarked}>
        <LuStar fill={bookmarked ? 'currentColor' : 'none'} /> {bookmarked ? 'Bookmarked' : 'Bookmark'}
      </Button>
    </HStack>
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
  // Hears the ride's weather emoji, for the page's title.
  onSky?: (sky: string | null) => void;
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
          {undefined !== shared.data && <RiderActions shareId={shareId} />}
        </HStack>
        {shared.isPending && (
          <Center paddingY="48px">
            <Spinner />
          </Center>
        )}
        {shared.isError && (
          <Text color="fg.muted">This ride is not shared any more: links last 15 days. Ask for a new one.</Text>
        )}
        {undefined !== shared.data && <SharedRideWeather shared={shared.data} locale={SHARED_LOCALE} onSky={setSky} />}
      </Stack>
    </Box>
  );
};

export {SharedRidePage, SharedRideWeather};
