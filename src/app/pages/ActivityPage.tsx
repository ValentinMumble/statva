import {useMemo, useState} from 'react';
import {Badge, Box, Button, Grid, HStack, Icon, Image, Skeleton, Stack, Text} from '@chakra-ui/react';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {Link, useLocation, useParams} from 'react-router';
import {LuArrowLeft, LuExternalLink, LuRefreshCw} from 'react-icons/lu';
import {useActivityMeta, useAllActivities, useFtp, useLabels, useSettings} from '../../hooks';
import {getFetcher} from '../../hooks/useFetcher';
import {
  decodePolyline,
  extractNormalizedPower,
  getActivityUrl,
  getHeartRateZone,
  getPowerZone,
  getZoneColor,
  getTypes,
  hasKom,
  intensityOf,
  isPedalled,
  terrainOf,
} from '../../models';
import {Activity, ActivityType, ActivityZone, DetailedActivity} from '../../models/strava';
import {ActivityPhoto} from '../../api';
import {Card, CardTitle} from '../components/Card';
import {sportIcon} from '../components/sport';
import {TrackMap} from '../components/TrackMap';
import {duration, km, metres, number} from '../format';

const fetchZones = getFetcher<ActivityZone[]>('activity.zones');
const refreshActivity = getFetcher<DetailedActivity>('activity.refresh');
const fetchPhotos = getFetcher<ActivityPhoto[]>('activity.photos');

// The biggest size Strava sent, for a photo opened on its own.
const largest = (urls: Record<string, string>): string | undefined =>
  Object.entries(urls).sort(([a], [b]) => Number(b) - Number(a))[0]?.[1];

/**
 * Every photo of the activity, fetched from Strava when the page opens (the stored
 * details only hold the main one, shown meanwhile). A photo opens full size on its own.
 */
const Photos = ({activity, detail}: {activity: Activity; detail: DetailedActivity | null}) => {
  // The details are fetched again on Refresh, so their count is the freshest one.
  const count = detail?.total_photo_count ?? activity.total_photo_count;
  const {data: photos} = useQuery({
    queryKey: ['photos', activity.id, count],
    queryFn: () => fetchPhotos(activity.id),
    enabled: 0 < count,
    retry: false,
  });
  const primary = detail?.photos?.primary?.urls;
  const shown: {key: string; url: string; full: string}[] =
    undefined !== photos && 0 < photos.length
      ? photos.flatMap(({unique_id, urls}) => {
          const url = largest(urls);

          return undefined === url ? [] : [{key: unique_id, url, full: url}];
        })
      : undefined !== primary
        ? [{key: 'primary', url: primary[600] ?? primary[100], full: primary[600] ?? primary[100]}]
        : [];

  if (0 === count || 0 === shown.length) return null;

  return (
    <Card>
      <CardTitle>
        {count} {1 === count ? 'photo' : 'photos'}
      </CardTitle>
      <Grid templateColumns={{base: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))'}} gap="8px">
        {shown.map(({key, url, full}) => (
          <a key={key} href={full} target="_blank" rel="noreferrer">
            <Image src={url} alt="" loading="lazy" width="100%" aspectRatio="4 / 3" objectFit="cover" borderRadius="10px" />
          </a>
        ))}
      </Grid>
    </Card>
  );
};

const ZONE_COLORS = ['gray.400', 'blue.400', 'green.400', 'yellow.400', 'orange.400', 'red.400'];

// zone: the power or heart rate zone of the figure, shown as a badge in its colour.
// zone: the power or heart rate zone of the figure, shown as a badge in its colour; tag: any
// other badge, with a line explaining it on hover.
type FigureItem = {label: string; value: string | null; zone?: number; tag?: {label: string; colorPalette: string; title?: string}};

const Figures = ({items}: {items: FigureItem[]}) => (
  <Grid templateColumns={{base: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)'}} gap="18px">
    {items
      .filter(({value}) => null !== value)
      .map(({label, value, zone, tag}) => (
        <Stack key={label} gap="0">
          <Text fontSize="xs" color="fg.muted" textTransform="uppercase" letterSpacing="0.06em">
            {label}
          </Text>
          <HStack gap="8px">
            <Text fontFamily="figure" fontSize="xl" fontWeight="semibold">
              {value}
            </Text>
            {zone ? (
              <Badge size="sm" variant="subtle" colorPalette={getZoneColor(zone)}>
                Zone {zone}
              </Badge>
            ) : null}
            {tag ? (
              <Badge size="sm" variant="subtle" colorPalette={tag.colorPalette} title={tag.title}>
                {tag.label}
              </Badge>
            ) : null}
          </HStack>
        </Stack>
      ))}
  </Grid>
);

/** Time in each heart rate zone, as one bar and a line per zone. */
const HeartRateZones = ({activity}: {activity: Activity}) => {
  const {data} = useQuery({
    queryKey: ['zones', activity.id],
    queryFn: () => fetchZones(activity.id),
    enabled: activity.has_heartrate,
  });
  const buckets = data?.find(({type}) => 'heartrate' === type)?.distribution_buckets ?? [];
  const total = buckets.reduce((sum, {time}) => sum + time, 0);

  if (!activity.has_heartrate) return null;

  return (
    <Card>
      <CardTitle>Heart rate zones</CardTitle>
      {0 === total ? (
        <Skeleton height="80px" />
      ) : (
        <Stack gap="12px">
          <HStack gap="2px" height="12px" borderRadius="full" overflow="hidden">
            {buckets.map(({time}, index) => (
              <Box key={index} height="full" flex={time} background={ZONE_COLORS[index + 1] ?? 'gray.400'} />
            ))}
          </HStack>
          <Stack gap="6px">
            {buckets.map(({min, max, time}, index) => (
              <HStack key={index} justifyContent="space-between" fontSize="sm">
                <HStack gap="8px">
                  <Box width="10px" height="10px" borderRadius="3px" background={ZONE_COLORS[index + 1] ?? 'gray.400'} />
                  <Text>Z{index + 1}</Text>
                  <Text color="fg.muted">{-1 === max ? `${min}+ bpm` : `${min}–${max} bpm`}</Text>
                </HStack>
                <Text fontFamily="figure">
                  {duration(time)} <Text as="span" color="fg.muted">· {Math.round((time / total) * 100)}%</Text>
                </Text>
              </HStack>
            ))}
          </Stack>
        </Stack>
      )}
    </Card>
  );
};

const ActivityPage = () => {
  const {activityId} = useParams();
  // Back to the list as it was left, filters included, when the activity was opened from it.
  const list = (useLocation().state as {list?: string} | null)?.list ?? '/activities';
  const {data: activities} = useAllActivities();
  const queryClient = useQueryClient();
  const {activityMeta, refetch} = useActivityMeta();
  const {label} = useLabels();
  const {locale, mapCenter} = useSettings();
  const {getFtp} = useFtp();
  const [refreshing, setRefreshing] = useState(false);

  const summary = activities?.find(({id}) => String(id) === activityId);
  const detail: DetailedActivity | null = activityMeta[activityId ?? ''] ?? null;
  // The summary has every figure; the details add notes, calories, devices and the full track.
  const activity: Activity | undefined = summary;
  const track = useMemo(
    () => decodePolyline(detail?.map?.polyline || activity?.map?.summary_polyline || ''),
    [detail, activity],
  );
  // A ride's climbing, graded against the rider's other rides.
  const difficulty = useMemo(() => {
    if (undefined === activity || !activity.sport_type.includes('Ride')) return null;
    const rides = getTypes(ActivityType.Ride);

    return terrainOf(activity, (activities ?? []).filter(({sport_type}) => rides.includes(sport_type)));
  }, [activity, activities]);

  if (undefined === activities) return <Skeleton height="400px" borderRadius="card" />;
  if (undefined === activity) {
    return (
      <Stack gap="12px">
        <Text>This activity is not in Statva.</Text>
        <Link to="/activities">← All activities</Link>
      </Stack>
    );
  }

  const date = new Date(activity.start_date);
  const ftp = getFtp(date);
  const intensity = intensityOf(activity, detail, ftp);
  // No zone without an FTP to measure it against.
  // Cycling zones: none for a run's power, nor without an FTP to measure against.
  const powerZone = (watts: number | undefined | null): number =>
    isPedalled(activity.sport_type) && 0 < ftp && watts ? getPowerZone(watts, ftp) : 0;
  const np = extractNormalizedPower(detail);
  const speed = activity.average_speed * 3.6;

  const handleRefresh = async () => {
    setRefreshing(true);
    const fresh = await refreshActivity(activity.id);
    // The list holds the summary every figure here reads: put the fresh one in it too.
    queryClient.setQueryData<Activity[]>(['activities'], list =>
      // Its own light route is kept: the details carry the full-resolution one.
      list?.map(listed => (listed.id === activity.id ? ({...listed, ...fresh, map: listed.map} as Activity) : listed)),
    );
    await refetch();
    setRefreshing(false);
  };

  return (
    <Stack gap={{base: '16px', md: '24px'}}>
      <Link to={list}>
        <HStack gap="6px" color="fg.muted" fontSize="sm" _hover={{color: 'fg'}}>
          <LuArrowLeft /> Activities
        </HStack>
      </Link>

      <HStack justifyContent="space-between" alignItems="flex-start" gap="16px" flexWrap="wrap">
        <Stack gap="4px" minWidth="0">
          <HStack gap="8px" color="fg.muted" fontSize="sm">
            <Icon as={sportIcon(activity.sport_type)} />
            <Text>
              {date.toLocaleDateString(locale, {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'})} ·{' '}
              {date.toLocaleTimeString(locale, {hour: '2-digit', minute: '2-digit'})}
            </Text>
          </HStack>
          <Text fontFamily="heading" fontSize={{base: '2xl', md: '3xl'}} fontWeight="bold" letterSpacing="-0.02em">
            {activity.name}
          </Text>
          <HStack gap="6px" flexWrap="wrap">
            {activity.gear_id && <Badge variant="surface">{label(activity.gear_id)}</Badge>}
            {activity.commute && <Badge variant="surface">Commute</Badge>}
            {activity.private && <Badge variant="surface">Private</Badge>}
            {hasKom(detail) && <Badge colorPalette="yellow">KOM 👑</Badge>}
            {1 < activity.athlete_count && <Badge variant="surface">{activity.athlete_count} riders</Badge>}
          </HStack>
        </Stack>
        <HStack gap="8px">
          <Button size="sm" variant="ghost" onClick={handleRefresh} loading={refreshing}>
            <LuRefreshCw /> Refresh
          </Button>
          <Button size="sm" variant="outline" asChild={true}>
            <a href={getActivityUrl(activity)} target="_blank" rel="noreferrer">
              Strava <LuExternalLink />
            </a>
          </Button>
        </HStack>
      </HStack>

      {0 < track.length && <TrackMap tracks={[track]} center={mapCenter} height={{base: '260px', md: '380px'}} />}

      <Grid templateColumns={{base: 'minmax(0, 1fr)', lg: 'minmax(0, 1.6fr) minmax(0, 1fr)'}} gap={{base: '16px', md: '24px'}} alignItems="start">
        <Stack gap={{base: '16px', md: '24px'}}>
          <Card>
            <Figures
              items={[
                {label: 'Distance', value: 0 < activity.distance ? km(activity.distance, locale) : null},
                {label: 'Moving time', value: duration(activity.moving_time)},
                {label: 'Elapsed', value: duration(activity.elapsed_time)},
                {label: 'Climbing', value: 0 < activity.total_elevation_gain ? metres(activity.total_elevation_gain, locale) : null},
                {
                  label: 'Elevation',
                  value: null === difficulty ? null : `${number(difficulty.percent, locale, 2)}%`,
                  tag:
                    null === difficulty
                      ? undefined
                      : {
                          label: difficulty.terrain.name,
                          colorPalette: difficulty.terrain.colorPalette,
                          title:
                            null === difficulty.steeperThan
                              ? 'By metres climbed per km, until there are more rides to compare with'
                              : `Climbs more per km than ${Math.round(difficulty.steeperThan * 100)}% of your rides`,
                        },
                },
                {label: 'Average speed', value: 0 < speed ? `${number(speed, locale, 1)} km/h` : null},
                {label: 'Max speed', value: 0 < activity.max_speed ? `${number(activity.max_speed * 3.6, locale, 1)} km/h` : null},
                {
                  label: 'Average power',
                  value: activity.average_watts ? `${Math.round(activity.average_watts)} W` : null,
                  zone: powerZone(activity.average_watts),
                },
                {
                  label: 'Weighted power',
                  value: activity.weighted_average_watts ? `${activity.weighted_average_watts} W` : null,
                  zone: powerZone(activity.weighted_average_watts),
                },
                {label: 'Normalized power', value: np ? `${np} W` : null, zone: powerZone(np)},
                {label: 'Intensity', value: null === intensity ? null : `${Math.round(intensity * 100)}%`},
                {
                  label: 'Average heart rate',
                  value: activity.average_heartrate ? `${Math.round(activity.average_heartrate)} bpm` : null,
                  zone: getHeartRateZone(activity.average_heartrate ?? 0),
                },
                {
                  label: 'Max heart rate',
                  value: activity.max_heartrate ? `${Math.round(activity.max_heartrate)} bpm` : null,
                  zone: getHeartRateZone(activity.max_heartrate ?? 0),
                },
                {label: 'Cadence', value: activity.average_cadence ? `${Math.round(activity.average_cadence)}` : null},
                {label: 'Calories', value: detail?.calories ? `${number(detail.calories, locale)} kcal` : null},
                {label: 'Temperature', value: undefined !== activity.average_temp ? `${activity.average_temp}°C` : null},
                {label: 'Suffer score', value: activity.suffer_score ? `${activity.suffer_score}` : null},
                {label: 'Kudos', value: `${activity.kudos_count}`},
                {label: 'Achievements', value: 0 < activity.achievement_count ? `${activity.achievement_count}` : null},
                {label: 'PRs', value: 0 < activity.pr_count ? `${activity.pr_count}` : null},
              ]}
            />
          </Card>
          <Photos activity={activity} detail={detail} />
          {(detail?.description || detail?.private_note) && (
            <Card>
              <CardTitle>Notes</CardTitle>
              <Stack gap="12px">
                {detail.description && <Text whiteSpace="pre-wrap">{detail.description}</Text>}
                {detail.private_note && (
                  <Box background="bg.subtle" borderRadius="10px" padding="12px">
                    <Text fontSize="xs" color="fg.muted" marginBottom="4px">
                      Private note
                    </Text>
                    <Text whiteSpace="pre-wrap">{detail.private_note}</Text>
                  </Box>
                )}
              </Stack>
            </Card>
          )}
        </Stack>
        <Stack gap={{base: '16px', md: '24px'}}>
          <HeartRateZones activity={activity} />
          {null !== detail && (
            <Card>
              <CardTitle>Recorded with</CardTitle>
              <Text>{detail.device_name || 'Unknown device'}</Text>
              {activity.device_watts && (
                <Text fontSize="sm" color="fg.muted">
                  With a power meter
                </Text>
              )}
            </Card>
          )}
          {null === detail && (
            <Card>
              <Text fontSize="sm" color="fg.muted">
                Notes, calories and the full track arrive once Statva has fetched this activity's details. Refresh to fetch them now.
              </Text>
            </Card>
          )}
        </Stack>
      </Grid>
    </Stack>
  );
};

export {ActivityPage};
