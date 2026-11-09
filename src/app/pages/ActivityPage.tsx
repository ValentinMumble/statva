import {useEffect, useMemo, useState} from 'react';
import {
  Badge,
  Box,
  Button,
  Checkbox,
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
import {LuArrowLeft, LuCopy, LuExternalLink, LuMapPin, LuPencil, LuRefreshCw, LuSmilePlus} from 'react-icons/lu';
import {FaHeart} from 'react-icons/fa6';
import {useActivityMeta, useAllActivities, useFtp, useGear, useLabels, useSettings} from '../../hooks';
import {getFetcher} from '../../hooks/useFetcher';
import {
  activityHighlight,
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
  messagePieces,
  haversine,
  LOOP_GAP,
  suggestName,
  findStops,
  sunTimes,
  terrainOf,
} from '../../models';
import {Activity, ActivityType, ActivityZone, Comment, DetailedActivity} from '../../models/strava';
import type {ActivityStreams, Stop} from '../../models/stops';
import {ActivityNote, ActivityPhoto, IgnoredByStravaError, NoWriteAccessError, UploadRefusedError} from '../../api';
import {DateInput, TimeInput, toaster} from '../../components/ui';
import {Card, CardTitle} from '../components/Card';
import {DaylightBar} from '../components/DaylightBar';
import {GearField} from '../components/GearField';
import {TopTenTrophy} from '../components/HighlightTags';
import {sportIcon} from '../components/sport';
import {TrackMap} from '../components/TrackMap';
import {divIcon} from 'leaflet';
import {Marker, Tooltip as MapTooltip} from 'react-leaflet';
import {RingFrame} from '../components/RouteThumb';
import {duration, km, metres, number, relativeDay} from '../format';

const fetchZones = getFetcher<ActivityZone[]>('activity.zones');
const fetchStreams = getFetcher<ActivityStreams>('activity.streams');
// A stop's dot on the map: amber, apart from the route's orange and its ends' green and black.
const STOP_COLOR = '#f5a524';
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
  const [gearId, setGearId] = useState(activity.gear_id ?? '');
  const [commute, setCommute] = useState(activity.commute);
  const [copying, setCopying] = useState(false);

  const duplicate = async () => {
    setCopying(true);
    try {
      const result = await copyActivity(activity.id, {date, time, gearId: gearId || 'none', commute});
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
              ? messagePieces(error.message)
                  .map(piece => ('text' in piece ? piece.text : piece.name))
                  .join('')
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
                  The same ride with its name, starting then. It stays off your followers' feeds.
                </Text>
                <HStack gap="12px">
                  <Field.Root>
                    <Field.Label>Day</Field.Label>
                    <DateInput value={date} onChange={({target}) => setDate(target.value)} />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>Start</Field.Label>
                    <TimeInput value={time} onChange={({target}) => setTime(target.value)} />
                  </Field.Root>
                </HStack>
                <GearField sport={activity.sport_type} value={gearId} onChange={setGearId} />
                <Checkbox.Root checked={commute} onCheckedChange={({checked}) => setCommute(true === checked)}>
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                  <Checkbox.Label>Commute</Checkbox.Label>
                </Checkbox.Root>
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
const usePhotos = (activity: Activity | undefined, detail: DetailedActivity | null) => {
  // The details are fetched again on Refresh, so their count is the freshest one.
  const count = detail?.total_photo_count ?? activity?.total_photo_count ?? 0;
  const {data: photos} = useQuery({
    queryKey: ['photos', activity?.id, count],
    queryFn: () => fetchPhotos(activity?.id ?? 0),
    enabled: 0 < count,
    retry: false,
  });

  return {count, photos};
};

// Photos taken within about 10 m of each other share one spot on the map.
const photoSpot = ([lat, lng]: [number, number]): string => `${lat.toFixed(4)},${lng.toFixed(4)}`;

/**
 * The activity's photos where they were taken, as small thumbnails on its map: one per spot,
 * with how many when several were taken there. A click opens the photo full size.
 */
const PhotoMarkers = ({photos}: {photos: ActivityPhoto[]}) => {
  const spots = new Map<string, {location: [number, number]; url: string; caption: string; count: number}>();
  for (const {location, urls, caption} of photos) {
    const url = largest(urls);
    if (!Array.isArray(location) || 2 !== location.length || undefined === url) continue;
    const spot = spots.get(photoSpot(location));
    if (undefined === spot) spots.set(photoSpot(location), {location, url, caption: caption ?? '', count: 1});
    else spot.count++;
  }

  return [...spots.values()].map(({location, url, caption, count}) => (
    <Marker
      key={photoSpot(location)}
      position={location}
      eventHandlers={{click: () => window.open(url, '_blank', 'noreferrer')}}
      icon={divIcon({
        className: '',
        iconSize: [38, 38],
        iconAnchor: [19, 19],
        html: `<div style="position:relative;width:38px;height:38px;border-radius:9px;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.5);background:#333 center/cover no-repeat url('${encodeURI(url)}')">${
          1 < count
            ? `<span style="position:absolute;top:-7px;right:-7px;min-width:18px;height:18px;padding:0 4px;border-radius:9px;background:#f25c14;color:white;font:600 11px/18px system-ui,sans-serif;text-align:center">${count}</span>`
            : ''
        }</div>`,
      })}
    >
      {'' !== caption && <MapTooltip>{caption}</MapTooltip>}
    </Marker>
  ));
};

const Photos = ({activity, detail}: {activity: Activity; detail: DetailedActivity | null}) => {
  const {count, photos} = usePhotos(activity, detail);
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

// extra: a companion figure, small and grey beside the value ("max 56.0"); zone: the power or
// heart rate zone, a dot in its colour; tag: any other badge, with a line explaining it on hover.
type FigureItem = {
  label: string;
  value: string | null;
  extra?: string | null;
  zone?: number;
  tag?: {label: string; colorPalette: string; title?: string};
};

const ZoneDot = ({zone}: {zone: number}) => (
  <HStack as="span" gap="4px" title={`Zone ${zone}`} fontSize="xs" color="fg.muted" flexShrink={0}>
    <Box as="span" boxSize="8px" borderRadius="full" background={`${getZoneColor(zone)}.solid`} />Z{zone}
  </HStack>
);

const FigureMarks = ({zone, tag}: Pick<FigureItem, 'zone' | 'tag'>) => (
  <>
    {zone ? <ZoneDot zone={zone} /> : null}
    {tag ? (
      <Badge size="sm" variant="subtle" colorPalette={tag.colorPalette} title={tag.title}>
        {tag.label}
      </Badge>
    ) : null}
  </>
);

/**
 * The activity's figures: the few that matter as large numbers in one strip, then the rest as
 * a short list, a line each, two columns on a wide screen. Paired figures share a line (the
 * average with its max). Anything with no value is left out.
 */
const Figures = ({headline, rows}: {headline: FigureItem[]; rows: FigureItem[]}) => {
  const shownHeadline = headline.filter(({value}) => null !== value);
  const shownRows = rows.filter(({value}) => null !== value);

  return (
    <Stack gap="18px">
      <Grid templateColumns="repeat(auto-fit, minmax(110px, 1fr))" gap="16px 20px">
        {shownHeadline.map(({label, value, extra, zone, tag}) => (
          <Stack key={label} gap="2px" minWidth="0">
            <Text fontSize="xs" color="fg.muted">
              {label}
            </Text>
            <Text fontFamily="figure" fontSize="2xl" fontWeight="semibold" lineHeight="1.1">
              {value}
            </Text>
            {(extra || zone || tag) && (
              <HStack gap="6px" fontSize="xs" color="fg.muted" flexWrap="wrap">
                {extra ? (
                  <Text as="span" fontFamily="figure">
                    {extra}
                  </Text>
                ) : null}
                <FigureMarks zone={zone} tag={tag} />
              </HStack>
            )}
          </Stack>
        ))}
      </Grid>
      {0 < shownRows.length && (
        <Grid templateColumns={{base: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))'}} columnGap="32px">
          {shownRows.map(({label, value, extra, zone, tag}) => (
            <HStack
              key={label}
              justifyContent="space-between"
              gap="12px"
              paddingY="7px"
              borderTopWidth="1px"
              borderColor="border.muted"
              fontSize="sm"
            >
              <Text color="fg.muted" flexShrink={0}>
                {label}
              </Text>
              <HStack gap="6px" minWidth="0" justifyContent="flex-end" flexWrap="wrap">
                <Text as="span" fontFamily="figure" fontWeight="semibold">
                  {value}
                </Text>
                {extra ? (
                  <Text as="span" fontFamily="figure" color="fg.muted">
                    {extra}
                  </Text>
                ) : null}
                <FigureMarks zone={zone} tag={tag} />
              </HStack>
            </HStack>
          ))}
        </Grid>
      )}
    </Stack>
  );
};

/** Time in each heart rate zone, as one bar and a line per zone. */
const fetchPlaceNames = getFetcher<(string | null)[]>('place.names');

/**
 * Where an activity went, from the towns OpenStreetMap names at its start and end: "Rosnoën →
 * Plœmeur", or "Loop from Nantes" when it ends where it started. Nothing indoors, without a
 * start and end, or while the names are unknown.
 */
const Places = ({activity, locale}: {activity: Activity; locale: string}) => {
  const located = !activity.trainer && 2 === activity.start_latlng?.length && 2 === activity.end_latlng?.length;
  const ends = located ? [activity.start_latlng, activity.end_latlng].map(([lat, lng]) => ({lat, lng})) : [];
  const names = useQuery({
    queryKey: ['placeNames', locale, ...ends.map(({lat, lng}) => `${lat.toFixed(3)},${lng.toFixed(3)}`)],
    queryFn: () => fetchPlaceNames(ends, locale),
    enabled: located,
    staleTime: Infinity,
    retry: false,
  });
  const [from, to] = names.data ?? [null, null];
  if (!located || null === from) return null;
  const loop = haversine(ends[0], ends[1]) <= LOOP_GAP;
  if (!loop && null === to) return null;

  return (
    <HStack gap="4px">
      <LuMapPin aria-hidden="true" />
      <Text>{loop || from === to ? `Loop from ${from}` : `${from} → ${to}`}</Text>
    </HStack>
  );
};

/**
 * The ride on the day's light where it started, as Ride weather shows a planned one: sunrise,
 * sunset and the ride between, at the ride's own local time. Nothing for a ride indoors or
 * without a start.
 */
/** A moment as the clock read where the activity was, wherever the page is opened. */
const localClock = (activity: Activity, locale: string) => {
  // Strava gives the start's local time as if it were UTC: the gap is the place's offset.
  const offset = new Date(activity.start_date_local).getTime() - new Date(activity.start_date).getTime();

  return (time: number): string =>
    new Date(time + offset).toLocaleTimeString(locale, {hour: '2-digit', minute: '2-digit', timeZone: 'UTC'});
};

const Daylight = ({activity, locale, stops = []}: {activity: Activity; locale: string; stops?: Stop[]}) => {
  if (activity.trainer || 2 !== activity.start_latlng?.length) return null;

  const start = new Date(activity.start_date).getTime();
  const finish = start + activity.elapsed_time * 1000;
  const sun = sunTimes(start, activity.start_latlng);
  if (null === sun) return null;

  const clock = localClock(activity, locale);
  const minutes = (milliseconds: number): string => duration(Math.round(milliseconds / 1000));

  return (
    <Card>
      <CardTitle>Daylight</CardTitle>
      <Text>
        Sunrise {clock(sun.rise)} · sunset {clock(sun.set)}
      </Text>
      <Text fontSize="sm" color="fg.muted">
        {start < sun.rise
          ? `Started ${minutes(sun.rise - start)} before sunrise`
          : finish > sun.set
            ? `Finished ${minutes(finish - sun.set)} after sunset`
            : `Finished ${minutes(sun.set - finish)} before sunset`}
      </Text>
      <DaylightBar
        start={start}
        finish={finish}
        sun={sun}
        clock={clock}
        pauses={stops.map(stop => ({
          start: start + stop.start * 1000,
          end: start + (stop.start + stop.duration) * 1000,
        }))}
      />
    </Card>
  );
};

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
  // Another activity opens at its top, not where the last one was left.
  // In braces: scrollTo returns a promise in recent browsers, and an effect may only return a
  // clean-up function.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activityId]);
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
  // A race or a 100 km day, as the lists mark them.
  const highlight = undefined === activity ? null : activityHighlight(activity);
  // A ride's climbing, graded against the rider's other rides; a run's against their runs.
  const kindName =
    undefined !== activity && getTypes(ActivityType.Run).includes(activity.sport_type as ActivityType)
      ? 'runs'
      : 'rides';
  // Its stops of 2 minutes or more, from its recorded points: outdoors only.
  const outdoors = undefined !== activity && !activity.trainer && 2 === activity.start_latlng?.length;
  const streams = useQuery({
    queryKey: ['streams', activity?.id],
    queryFn: () => fetchStreams(activity?.id ?? 0),
    enabled: outdoors,
    staleTime: Infinity,
    retry: false,
  });
  const stops = useMemo(() => (undefined === streams.data ? [] : findStops(streams.data)), [streams.data]);
  // The same photos as the photos card below (one fetch for both), to put on the map.
  const {photos} = usePhotos(activity, detail ?? null);
  const difficulty = useMemo(() => {
    if (undefined === activity) return null;
    const kind = [ActivityType.Ride, ActivityType.Run].find(type =>
      getTypes(type).includes(activity.sport_type as ActivityType),
    );
    if (undefined === kind) return null;
    const sameKind: string[] = getTypes(kind);

    return terrainOf(
      activity,
      (activities ?? []).filter(({sport_type}) => sameKind.includes(sport_type)),
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
      {/* On a phone, the header's title leads back instead. */}
      <Box hideBelow="md">
        <Link to={list}>
          <HStack gap="6px" color="fg.muted" fontSize="sm" _hover={{color: 'fg'}}>
            <LuArrowLeft /> Activities
          </HStack>
        </Link>
      </Box>

      <HStack justifyContent="space-between" alignItems="flex-start" gap="16px" flexWrap="wrap">
        <Stack gap="4px" minWidth="0" flex="1" flexBasis={{base: '100%', md: '0'}}>
          <HStack gap="8px" color="fg.muted" fontSize="sm" flexWrap="wrap">
            <Icon as={sportIcon(activity.sport_type)} />
            <Text>
              {date.toLocaleDateString(locale, {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'})} ·{' '}
              {date.toLocaleTimeString(locale, {hour: '2-digit', minute: '2-digit'})}
            </Text>
            <Places activity={activity} locale={locale} />
          </HStack>
          <ActivityTitle key={activity.id} activity={activity} history={activities} />
          <HStack gap="6px" flexWrap="wrap">
            <GearSelect activity={activity} />
            {'race' === highlight && (
              <Badge variant="solid" colorPalette="brand">
                Race
              </Badge>
            )}
            {'long' === highlight && (
              // The same moving ring as a 100 km day's thumbnail in the lists, round a small badge.
              <RingFrame radius="6px" thickness={1} fill="bg.panel">
                <Text fontSize="xs" fontWeight="medium" paddingX="7px" lineHeight="20px" whiteSpace="nowrap">
                  100 km+
                </Text>
              </RingFrame>
            )}
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

      {0 < track.length && (
        <TrackMap tracks={[track]} center={mapCenter} height={{base: '260px', md: '380px'}}>
          {undefined !== photos && <PhotoMarkers photos={photos} />}
          {/* Each stop where it began, as a square, bigger for a longer one. */}
          {stops.map(stop => {
            const side = Math.round(Math.min(26, 10 + 2 * Math.sqrt(stop.duration / 60)));

            return (
              <Marker
                key={stop.start}
                position={[stop.lat, stop.lng]}
                icon={divIcon({
                  className: '',
                  iconSize: [side, side],
                  iconAnchor: [side / 2, side / 2],
                  html: `<div style="width:${side}px;height:${side}px;box-sizing:border-box;border-radius:3px;border:2px solid white;background:${STOP_COLOR};box-shadow:0 1px 3px rgba(0,0,0,0.45)"></div>`,
                })}
              >
                <MapTooltip>
                  {duration(stop.duration)} stop at{' '}
                  {localClock(activity, locale)(new Date(activity.start_date).getTime() + stop.start * 1000)}
                </MapTooltip>
              </Marker>
            );
          })}
        </TrackMap>
      )}

      <Grid
        templateColumns={{base: 'minmax(0, 1fr)', lg: 'minmax(0, 1.6fr) minmax(0, 1fr)'}}
        gap={{base: '16px', md: '24px'}}
        alignItems="start"
      >
        <Stack gap={{base: '16px', md: '24px'}}>
          <Card>
            <Figures
              headline={[
                {label: 'Distance', value: 0 < activity.distance ? km(activity.distance, locale) : null},
                {
                  label: 'Moving time',
                  value: duration(activity.moving_time),
                  extra:
                    activity.elapsed_time > activity.moving_time ? `${duration(activity.elapsed_time)} elapsed` : null,
                },
                {
                  label: 'Climbing',
                  value: 0 < activity.total_elevation_gain ? metres(activity.total_elevation_gain, locale) : null,
                  extra: null === difficulty ? null : `${number(difficulty.percent, locale, 2)}%`,
                  tag:
                    null === difficulty
                      ? undefined
                      : {
                          label: difficulty.terrain.name,
                          colorPalette: difficulty.terrain.colorPalette,
                          title:
                            null === difficulty.steeperThan
                              ? `By metres climbed per km, until there are more ${kindName} to compare with`
                              : `Climbs more per km than ${Math.round(difficulty.steeperThan * 100)}% of your ${kindName}`,
                        },
                },
                {
                  label: 'Speed',
                  value: 0 < speed ? `${number(speed, locale, 1)} km/h` : null,
                  extra: 0 < activity.max_speed ? `max ${number(activity.max_speed * 3.6, locale, 1)}` : null,
                },
                {
                  label: 'Normalized power',
                  value: np ? `${np} W` : null,
                  zone: powerZone(np),
                },
              ]}
              rows={[
                {
                  label: 'Average power',
                  value: activity.average_watts ? `${Math.round(activity.average_watts)} W` : null,
                  extra: activity.weighted_average_watts ? `${activity.weighted_average_watts} W weighted` : null,
                  zone: powerZone(activity.average_watts),
                },
                {label: 'Max power', value: activity.max_watts ? `${activity.max_watts} W` : null},
                {label: 'Intensity', value: null === intensity ? null : `${Math.round(intensity * 100)}%`},
                {
                  label: 'Heart rate',
                  value: activity.average_heartrate ? `${Math.round(activity.average_heartrate)} bpm` : null,
                  extra: activity.max_heartrate ? `max ${Math.round(activity.max_heartrate)}` : null,
                  zone: getHeartRateZone(activity.average_heartrate ?? 0),
                },
                {label: 'Suffer score', value: activity.suffer_score ? `${activity.suffer_score}` : null},
                {
                  label: 'Stops',
                  value: 0 === stops.length ? null : duration(stops.reduce((sum, stop) => sum + stop.duration, 0)),
                  extra: 0 === stops.length ? null : `in ${stops.length}`,
                },
                {
                  label: 'Cadence',
                  value: activity.average_cadence ? `${Math.round(activity.average_cadence)} rpm` : null,
                },
                {label: 'Calories', value: detail?.calories ? `${number(detail.calories, locale)} kcal` : null},
                {
                  label: 'Temperature',
                  value: undefined !== activity.average_temp ? `${activity.average_temp}°C` : null,
                },
                {
                  label: 'On Strava',
                  value: [
                    `${activity.kudos_count} kudos`,
                    0 < activity.achievement_count ? `${activity.achievement_count} achievements` : null,
                    0 < activity.pr_count ? `${activity.pr_count} ${1 === activity.pr_count ? 'PR' : 'PRs'}` : null,
                  ]
                    .filter(part => null !== part)
                    .join(' · '),
                },
              ]}
            />
          </Card>
          <Photos activity={activity} detail={detail} />
          {/* On a phone, one column: the daylight comes before the notes rather than at the end. */}
          <Box hideFrom="lg">
            <Daylight activity={activity} locale={locale} stops={stops} />
          </Box>
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
          <Box hideBelow="lg">
            <Daylight activity={activity} locale={locale} stops={stops} />
          </Box>
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
