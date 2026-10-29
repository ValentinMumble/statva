import {useMemo, useState} from 'react';
import {
  Badge,
  Box,
  Button,
  Dialog,
  Field,
  Grid,
  HStack,
  Icon,
  IconButton,
  Image,
  Input,
  NativeSelect,
  Portal,
  Skeleton,
  Stack,
  Text,
  Textarea,
} from '@chakra-ui/react';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {Link, useLocation, useNavigate, useParams} from 'react-router';
import {LuArrowLeft, LuCopy, LuExternalLink, LuPencil, LuRefreshCw, LuSmilePlus} from 'react-icons/lu';
import {FaHeart} from 'react-icons/fa6';
import {useActivityMeta, useAllActivities, useFtp, useGear, useLabels, useSettings} from '../../hooks';
import {getFetcher} from '../../hooks/useFetcher';
import {
  bestKomRank,
  CopyResult,
  decodePolyline,
  extractNormalizedPower,
  getActivityUrl,
  getHeartRateZone,
  getPowerZone,
  getZoneColor,
  getTypes,
  hasEmoji,
  intensityOf,
  isPedalled,
  suggestName,
  terrainOf,
} from '../../models';
import {Activity, ActivityType, ActivityZone, Comment, DetailedActivity} from '../../models/strava';
import {ActivityNote, ActivityPhoto, IgnoredByStravaError, NoWriteAccessError, UploadRefusedError} from '../../api';
import {toaster} from '../../components/ui';
import {Card, CardTitle} from '../components/Card';
import {TopTenTrophy} from '../components/HighlightTags';
import {sportIcon} from '../components/sport';
import {TrackMap} from '../components/TrackMap';
import {duration, km, metres, number, relativeDay} from '../format';

const fetchZones = getFetcher<ActivityZone[]>('activity.zones');
const refreshActivity = getFetcher<DetailedActivity>('activity.refresh');
const renameActivity = getFetcher<void>('activity.rename');
const setActivityGear = getFetcher<void>('activity.gear');
const setActivityNote = getFetcher<void>('activity.note');
const copyActivity = getFetcher<CopyResult>('activity.copy');

const NOTE_NAMES: Record<ActivityNote, string> = {description: 'Description', private_note: 'Private note'};

/** One of the activity's notes, with a pencil to change it, saved on Strava. */
const NoteField = ({activity, detail, note}: {activity: Activity; detail: DetailedActivity; note: ActivityNote}) => {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const text = detail[note] ?? '';

  const save = async () => {
    const value = (draft ?? '').trim();
    if (value === text) return setDraft(null);

    setSaving(true);
    try {
      await setActivityNote(activity.id, note, value);
      queryClient.setQueryData<Record<string, DetailedActivity>>(['activityMeta'], loaded =>
        loaded?.[activity.id] ? {...loaded, [activity.id]: {...loaded[activity.id], [note]: value}} : loaded,
      );
      setDraft(null);
    } catch (error) {
      toaster.create({
        type: 'error',
        title:
          error instanceof NoWriteAccessError
            ? 'Log out and in again to let Statva change it on Strava'
            : error instanceof IgnoredByStravaError
              ? `Strava does not let apps change the ${NOTE_NAMES[note].toLowerCase()}: edit it on Strava`
              : 'Strava did not take the change',
      });
    }
    setSaving(false);
  };

  return (
    <Box
      background={'private_note' === note ? 'bg.subtle' : undefined}
      borderRadius="10px"
      padding={'private_note' === note ? '12px' : undefined}
    >
      <HStack justifyContent="space-between" marginBottom="4px">
        <Text fontSize="xs" color="fg.muted">
          {NOTE_NAMES[note]}
        </Text>
        {null === draft && (
          <IconButton
            aria-label={`Edit the ${NOTE_NAMES[note].toLowerCase()}`}
            size="xs"
            variant="ghost"
            color="fg.muted"
            onClick={() => setDraft(text)}
          >
            <LuPencil />
          </IconButton>
        )}
      </HStack>
      {null === draft ? (
        <Text whiteSpace="pre-wrap" color={'' === text ? 'fg.subtle' : undefined}>
          {'' === text ? 'None' : text}
        </Text>
      ) : (
        <Stack gap="8px">
          <Textarea
            autoFocus={true}
            autoresize={true}
            value={draft}
            onChange={({target}) => setDraft(target.value)}
            onKeyDown={event => 'Escape' === event.key && setDraft(null)}
            background="bg.panel"
            aria-label={NOTE_NAMES[note]}
          />
          <HStack gap="8px">
            <Button size="sm" colorPalette="brand" loading={saving} onClick={save}>
              Save
            </Button>
            <Button size="sm" variant="ghost" disabled={saving} onClick={() => setDraft(null)}>
              Cancel
            </Button>
          </HStack>
        </Stack>
      )}
    </Box>
  );
};

const FOOT_SPORTS = ['Run', 'TrailRun', 'VirtualRun', 'Walk', 'Hike'];

/** The bike (or shoes) the activity was done with, changed in place and saved on Strava. */
const GearSelect = ({activity}: {activity: Activity}) => {
  const queryClient = useQueryClient();
  const gear = useGear();
  const {label} = useLabels();
  const [saving, setSaving] = useState(false);
  const type = isPedalled(activity.sport_type) ? 'bike' : FOOT_SPORTS.includes(activity.sport_type) ? 'shoes' : null;
  // Retired gear is offered only when the activity is already on it.
  const options = gear.filter(item => item.type === type && (!item.retired || item.id === activity.gear_id));

  if (null === type) return activity.gear_id ? <Badge variant="surface">{label(activity.gear_id)}</Badge> : null;

  const change = async (gearId: string) => {
    setSaving(true);
    try {
      await setActivityGear(activity.id, gearId || 'none');
      const newGearId = gearId || null;
      queryClient.setQueryData<Activity[]>(['activities'], list =>
        list?.map(listed => (listed.id === activity.id ? {...listed, gear_id: newGearId} : listed)),
      );
      queryClient.setQueryData<Record<string, DetailedActivity>>(['activityMeta'], loaded =>
        loaded?.[activity.id] ? {...loaded, [activity.id]: {...loaded[activity.id], gear_id: newGearId}} : loaded,
      );
    } catch (error) {
      toaster.create({
        type: 'error',
        title:
          error instanceof NoWriteAccessError
            ? 'Log out and in again to let Statva change it on Strava'
            : 'Strava did not take the change',
      });
    }
    setSaving(false);
  };

  return (
    <NativeSelect.Root size="xs" width="auto" disabled={saving}>
      <NativeSelect.Field
        value={activity.gear_id ?? ''}
        onChange={({target}) => change(target.value)}
        aria-label={'bike' === type ? 'Bike' : 'Shoes'}
        borderRadius="full"
      >
        <option value="">{'bike' === type ? 'No bike' : 'No shoes'}</option>
        {options.map(item => (
          <option key={item.id} value={item.id}>
            {label(item.id) === item.id ? item.name : label(item.id)}
            {item.retired ? ' (retired)' : ''}
          </option>
        ))}
      </NativeSelect.Field>
      <NativeSelect.Indicator />
    </NativeSelect.Root>
  );
};
// Strava's own limit on an activity name.
const MAX_NAME_LENGTH = 255;

/** The activity's name, and a pencil to change it, saved on Strava. */
/**
 * Copies a ride ridden again the same way (a commute, say) with nothing recorded, to the day and
 * time chosen: today at the ride's own time by default. Then opens the copy.
 */
const DuplicateActivity = ({activity}: {activity: Activity}) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(() => new Date().toLocaleDateString('en-CA'));
  // Strava writes the local time with a Z, though it is not UTC.
  const [time, setTime] = useState(activity.start_date_local.slice(11, 16));
  const [copying, setCopying] = useState(false);

  const duplicate = async () => {
    setCopying(true);
    try {
      const result = await copyActivity(activity.id, {date, time});
      if ('copied' === result.outcome) {
        const copy = result.activity;
        queryClient.setQueryData<Activity[]>(['activities'], list => (list ? [...list, copy] : list));
        queryClient.setQueryData<Record<string, DetailedActivity>>(['activityMeta'], loaded =>
          loaded ? {...loaded, [copy.id]: copy as DetailedActivity} : loaded,
        );
        toaster.create({type: 'success', title: 'Duplicated'});
        setOpen(false);
        navigate(`/activities/${copy.id}`);
      } else {
        toaster.create({type: 'info', title: 'Strava is still making it: it shows up in a minute'});
      }
    } catch (error) {
      toaster.create({
        type: 'error',
        title:
          error instanceof NoWriteAccessError
            ? 'Log out and in again to let Statva upload to Strava'
            : error instanceof UploadRefusedError
              ? error.message
              : 'Strava could not be reached: try again',
      });
    }
    setCopying(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={({open: isOpen}) => setOpen(isOpen)} size="xs" placement="center">
      <Dialog.Trigger asChild={true}>
        <Button size="sm" variant="ghost">
          <LuCopy /> Duplicate
        </Button>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Duplicate {activity.name}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Stack gap="12px">
                <Text fontSize="sm" color="fg.muted">
                  The same ride, starting then, with its name, gear and commute flag. It stays off your followers'
                  feeds.
                </Text>
                <HStack gap="12px">
                  <Field.Root>
                    <Field.Label>Day</Field.Label>
                    <Input type="date" value={date} onChange={({target}) => setDate(target.value)} />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>Start</Field.Label>
                    <Input type="time" value={time} onChange={({target}) => setTime(target.value)} />
                  </Field.Root>
                </HStack>
              </Stack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button colorPalette="brand" onClick={duplicate} loading={copying} disabled={'' === date || '' === time}>
                Duplicate
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};

const ActivityTitle = ({activity, history}: {activity: Activity; history: Activity[]}) => {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<string | null>(null);
  // A name without an emoji gets the one most given to the same route, or an emoji not used yet.
  const addEmoji = () => {
    const usedEmojis = new Set(
      history.flatMap(({name}) => [...name.matchAll(/\p{Extended_Pictographic}/gu)].map(([match]) => match)),
    );
    setDraft(suggestName(activity, history, usedEmojis));
  };
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const name = draft?.trim() ?? '';
    if ('' === name || name === activity.name) return setDraft(null);

    setSaving(true);
    try {
      await renameActivity(activity.id, name);
      queryClient.setQueryData<Activity[]>(['activities'], list =>
        list?.map(listed => (listed.id === activity.id ? {...listed, name} : listed)),
      );
      queryClient.setQueryData<Record<string, DetailedActivity>>(['activityMeta'], loaded =>
        loaded?.[activity.id] ? {...loaded, [activity.id]: {...loaded[activity.id], name}} : loaded,
      );
      setDraft(null);
    } catch (error) {
      toaster.create({
        type: 'error',
        title:
          error instanceof NoWriteAccessError
            ? 'Log out and in again to let Statva rename on Strava'
            : 'Strava did not take the new name',
      });
    }
    setSaving(false);
  };

  if (null === draft) {
    return (
      <HStack gap="6px" alignItems="center">
        <Text fontFamily="heading" fontSize={{base: '2xl', md: '3xl'}} fontWeight="bold" letterSpacing="-0.02em">
          {activity.name}
        </Text>
        <IconButton
          aria-label="Rename"
          size="sm"
          variant="ghost"
          color="fg.muted"
          onClick={() => setDraft(activity.name)}
        >
          <LuPencil />
        </IconButton>
        {!hasEmoji(activity.name) && (
          <IconButton
            aria-label="Add an emoji"
            title="Add an emoji"
            size="sm"
            variant="ghost"
            color="fg.muted"
            onClick={addEmoji}
          >
            <LuSmilePlus />
          </IconButton>
        )}
      </HStack>
    );
  }

  return (
    <Stack direction={{base: 'column', md: 'row'}} gap="8px" width="full">
      <Input
        autoFocus={true}
        value={draft}
        maxLength={MAX_NAME_LENGTH}
        onChange={({target}) => setDraft(target.value)}
        onKeyDown={({key}) => ('Enter' === key ? save() : 'Escape' === key && setDraft(null))}
        fontFamily="heading"
        fontSize={{base: 'lg', md: 'xl'}}
        fontWeight="bold"
        aria-label="Activity name"
      />
      <HStack gap="8px" flexShrink={0}>
        <Button size="sm" colorPalette="brand" loading={saving} disabled={'' === draft.trim()} onClick={save}>
          Save
        </Button>
        <Button size="sm" variant="ghost" disabled={saving} onClick={() => setDraft(null)}>
          Cancel
        </Button>
      </HStack>
    </Stack>
  );
};
const fetchPhotos = getFetcher<ActivityPhoto[]>('activity.photos');
const fetchComments = getFetcher<Comment[]>('activity.comments');
// Strava's own orange, as for kudos on Home.
const STRAVA_ORANGE = '#fc4c02';

/**
 * The comments on the activity, and a box to answer. Strava lets apps read comments but not
 * post them, so the box copies the text and opens the activity on Strava to paste it there.
 */
const Comments = ({
  activity,
  detail,
  locale,
}: {
  activity: Activity;
  detail: DetailedActivity | null;
  locale: string;
}) => {
  const count = detail?.comment_count ?? activity.comment_count;
  const [draft, setDraft] = useState('');
  const {data: comments} = useQuery({
    queryKey: ['comments', activity.id, count],
    queryFn: () => fetchComments(activity.id),
    enabled: 0 < count,
    retry: false,
  });

  if (0 === count) return null;

  const answer = async () => {
    try {
      await navigator.clipboard.writeText(draft.trim());
      toaster.create({title: 'Copied: paste it in the comment box on Strava'});
    } catch {
      toaster.create({type: 'error', title: 'Could not copy the text: type it on Strava'});
    }
    window.open(getActivityUrl(activity), '_blank', 'noreferrer');
  };

  return (
    <Card>
      <CardTitle>Comments</CardTitle>
      <Stack gap="12px">
        {undefined === comments ? (
          <Skeleton height="40px" borderRadius="10px" />
        ) : (
          comments.map(({id, athlete, text, created_at, reaction_count: likes = 0, has_reacted: liked = false}) => (
            <Stack key={id} gap="2px">
              <HStack gap="8px" fontSize="sm">
                <Text fontWeight="medium">
                  {[athlete?.firstname, athlete?.lastname].filter(Boolean).join(' ') || 'Someone'}
                </Text>
                <Text color="fg.muted">{relativeDay(new Date(created_at), locale)}</Text>
                {0 < likes && (
                  <HStack
                    gap="4px"
                    color={liked ? STRAVA_ORANGE : 'fg.muted'}
                    title={liked ? `${likes} likes, yours among them` : `${likes} likes`}
                  >
                    <Icon as={FaHeart} boxSize="12px" />
                    <Text>{likes}</Text>
                  </HStack>
                )}
              </HStack>
              <Text whiteSpace="pre-wrap">{text}</Text>
            </Stack>
          ))
        )}
        <Stack gap="8px">
          <Textarea
            autoresize={true}
            value={draft}
            onChange={({target}) => setDraft(target.value)}
            placeholder="Write a comment"
            aria-label="Your comment"
          />
          <Button size="sm" variant="outline" alignSelf="flex-start" disabled={'' === draft.trim()} onClick={answer}>
            Copy and open on Strava <LuExternalLink />
          </Button>
          <Text fontSize="xs" color="fg.muted">
            Strava does not let apps post comments: paste it there.
          </Text>
        </Stack>
      </Stack>
    </Card>
  );
};

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
            <Image
              src={url}
              alt=""
              loading="lazy"
              width="100%"
              aspectRatio="4 / 3"
              objectFit="cover"
              borderRadius="10px"
            />
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
type FigureItem = {
  label: string;
  value: string | null;
  zone?: number;
  tag?: {label: string; colorPalette: string; title?: string};
};

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
                  <Box
                    width="10px"
                    height="10px"
                    borderRadius="3px"
                    background={ZONE_COLORS[index + 1] ?? 'gray.400'}
                  />
                  <Text>Z{index + 1}</Text>
                  <Text color="fg.muted">{-1 === max ? `${min}+ bpm` : `${min}–${max} bpm`}</Text>
                </HStack>
                <Text fontFamily="figure">
                  {duration(time)}{' '}
                  <Text as="span" color="fg.muted">
                    · {Math.round((time / total) * 100)}%
                  </Text>
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
  const {locale, mapCenter} = useSettings();
  const {getFtp} = useFtp();
  const [refreshing, setRefreshing] = useState(false);

  const summary = activities?.find(({id}) => String(id) === activityId);
  const detail: DetailedActivity | null = activityMeta[activityId ?? ''] ?? null;
  const komRank = bestKomRank(detail);
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

    return terrainOf(
      activity,
      (activities ?? []).filter(({sport_type}) => rides.includes(sport_type)),
    );
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
        <Stack gap="4px" minWidth="0" flex="1" flexBasis={{base: '100%', md: '0'}}>
          <HStack gap="8px" color="fg.muted" fontSize="sm">
            <Icon as={sportIcon(activity.sport_type)} />
            <Text>
              {date.toLocaleDateString(locale, {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'})} ·{' '}
              {date.toLocaleTimeString(locale, {hour: '2-digit', minute: '2-digit'})}
            </Text>
          </HStack>
          <ActivityTitle key={activity.id} activity={activity} history={activities} />
          <HStack gap="6px" flexWrap="wrap">
            <GearSelect activity={activity} />
            {activity.commute && <Badge variant="surface">Commute</Badge>}
            {activity.private && <Badge variant="surface">Private</Badge>}
            {1 === komRank && <Badge colorPalette="yellow">KOM 👑</Badge>}
            {null !== komRank && 1 < komRank && <TopTenTrophy rank={komRank} />}
            {1 < activity.athlete_count && <Badge variant="surface">{activity.athlete_count} riders</Badge>}
          </HStack>
        </Stack>
        <HStack gap="8px" flexWrap="wrap">
          {/* A manual entry has no recorded data to copy. */}
          {!activity.manual && <DuplicateActivity activity={activity} />}
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

      <Grid
        templateColumns={{base: 'minmax(0, 1fr)', lg: 'minmax(0, 1.6fr) minmax(0, 1fr)'}}
        gap={{base: '16px', md: '24px'}}
        alignItems="start"
      >
        <Stack gap={{base: '16px', md: '24px'}}>
          <Card>
            <Figures
              items={[
                {label: 'Distance', value: 0 < activity.distance ? km(activity.distance, locale) : null},
                {label: 'Moving time', value: duration(activity.moving_time)},
                {label: 'Elapsed', value: duration(activity.elapsed_time)},
                {
                  label: 'Climbing',
                  value: 0 < activity.total_elevation_gain ? metres(activity.total_elevation_gain, locale) : null,
                },
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
                {
                  label: 'Max speed',
                  value: 0 < activity.max_speed ? `${number(activity.max_speed * 3.6, locale, 1)} km/h` : null,
                },
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
                {
                  label: 'Temperature',
                  value: undefined !== activity.average_temp ? `${activity.average_temp}°C` : null,
                },
                {label: 'Suffer score', value: activity.suffer_score ? `${activity.suffer_score}` : null},
                {label: 'Kudos', value: `${activity.kudos_count}`},
                {label: 'Achievements', value: 0 < activity.achievement_count ? `${activity.achievement_count}` : null},
                {label: 'PRs', value: 0 < activity.pr_count ? `${activity.pr_count}` : null},
              ]}
            />
          </Card>
          <Photos activity={activity} detail={detail} />
          {null !== detail && (
            <Card>
              <CardTitle>Notes</CardTitle>
              <Stack gap="12px">
                <NoteField key={`${activity.id}-description`} activity={activity} detail={detail} note="description" />
                <NoteField
                  key={`${activity.id}-private_note`}
                  activity={activity}
                  detail={detail}
                  note="private_note"
                />
              </Stack>
            </Card>
          )}
          <Comments key={activity.id} activity={activity} detail={detail} locale={locale} />
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
                Notes, calories and the full track arrive once Statva has fetched this activity's details. Refresh to
                fetch them now.
              </Text>
            </Card>
          )}
        </Stack>
      </Grid>
    </Stack>
  );
};

export {ActivityPage};
