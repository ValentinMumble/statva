import {useLayoutEffect, useMemo, useRef, useState} from 'react';
import {
  Box,
  Button,
  HStack,
  Icon,
  IconButton,
  Input,
  InputGroup,
  Menu,
  Portal,
  SegmentGroup,
  Stack,
  Text,
  useBreakpointValue,
} from '@chakra-ui/react';
import {useNavigate, useSearchParams} from 'react-router';
import {useWindowVirtualizer} from '@tanstack/react-virtual';
import {useLocalStorage} from 'usehooks-ts';
import {LuArrowDown, LuArrowUp, LuColumns3, LuFilterX, LuListFilter, LuLock, LuSearch, LuWatch, LuX} from 'react-icons/lu';
import {GearSelect} from '../../components/GearSelect';
import {useActivities, useActivityMeta, useAllActivities, useFtp, useLabels, useSettings} from '../../hooks';
import {countBy, DEFAULT_SORTS, getRandomUnusedEmoji, isPedalled, SortDirection, SortType, TAGS} from '../../models';
import {Activity, ActivityType} from '../../models/strava';
import {Card} from '../components/Card';
import {HighlightTags} from '../components/HighlightTags';
import {RouteThumb} from '../components/RouteThumb';
import {sportIcon, sportName} from '../components/sport';
import {zoneTextColor} from '../components/zone';
import {duration, km, relativeDay} from '../format';

type Commute = boolean | 'only';

// Where the list was scrolled to when an activity was opened, with the filters it had then.
const SCROLL_KEY = 'activities-scroll';

const rememberScroll = (filters: string) => {
  try {
    sessionStorage.setItem(SCROLL_KEY, JSON.stringify({filters, y: window.scrollY}));
  } catch {
    // Without storage the list just opens at the top.
  }
};

const rememberedScroll = (filters: string): number | null => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SCROLL_KEY) ?? 'null') as {filters: string; y: number} | null;

    return null !== saved && saved.filters === filters ? saved.y : null;
  } catch {
    return null;
  }
};

type SportCount = {sport: string; count: number};

const isRide = isPedalled;
const isRun = (sport: string): boolean => sport.includes('Run');

// The usual choices in one tap; the menu next to them picks any mix of sports.
const SPORT_GROUPS: {value: string; label: string; pick: (sports: SportCount[]) => ActivityType[] | null}[] = [
  {value: 'all', label: 'All', pick: () => null},
  {value: 'rides', label: 'Rides', pick: sports => sports.filter(({sport}) => isRide(sport)).map(({sport}) => sport as ActivityType)},
  {value: 'runs', label: 'Runs', pick: sports => sports.filter(({sport}) => isRun(sport)).map(({sport}) => sport as ActivityType)},
  {value: 'other', label: 'Other', pick: sports => sports.filter(({sport}) => !isRide(sport) && !isRun(sport)).map(({sport}) => sport as ActivityType)},
];

/** Which group the current choice of sports matches, if any. */
const groupOf = (types: ActivityType[] | null, sports: SportCount[]): string => {
  if (null === types) return 'all';

  const chosen = [...types].sort().join();
  const group = SPORT_GROUPS.find(({pick}) => (pick(sports) ?? []).sort().join() === chosen);

  return group?.value ?? '';
};

const ROW_HEIGHT = {base: 68, md: 56};
const COLUMN_WIDTH = 112;

const Toolbar = ({
  search,
  onSearch,
  sports,
  types,
  onTypes,
  gearIds,
  onGear,
  commute,
  onCommute,
  withPrivate,
  onPrivate,
  columns,
  onColumns,
  label,
  devices,
  device,
  onDevice,
  onClear,
}: {
  search: string;
  onSearch: (value: string) => void;
  sports: {sport: string; count: number}[];
  types: ActivityType[] | null;
  onTypes: (types: ActivityType[] | null) => void;
  gearIds: string[];
  onGear: (gearIds: string[]) => void;
  commute: Commute;
  onCommute: (value: Commute) => void;
  withPrivate: boolean;
  onPrivate: () => void;
  columns: SortType[];
  onColumns: (columns: SortType[]) => void;
  devices: {device: string; count: number}[];
  device: string | null;
  onDevice: (device: string | null) => void;
  // Set when a filter narrows the list, to put them all back.
  onClear?: () => void;
  label: (key: string) => string;
}) => {
  const toggleSport = (sport: ActivityType) => {
    // From "all", unticking one sport keeps every other one.
    const current = types ?? (sports.map(({sport: name}) => name) as ActivityType[]);
    const next = current.includes(sport) ? current.filter(type => type !== sport) : [...current, sport];

    onTypes(0 === next.length || next.length === sports.length ? null : next);
  };

  return (
    <Stack gap="12px">
      <HStack gap="8px" flexWrap="wrap">
        <InputGroup flex="1" minWidth={{base: '0', md: '220px'}} startElement={<LuSearch />} endElement={'' === search ? undefined : (
          <IconButton aria-label="Clear the search" size="xs" variant="ghost" onClick={() => onSearch('')}>
            <LuX />
          </IconButton>
        )}>
          <Input
            placeholder="Search by name or date, like 2 nov"
            value={search}
            onChange={({target}) => onSearch(target.value)}
            onKeyDown={({key}) => 'Escape' === key && onSearch('')}
            borderRadius="10px"
            background="bg.panel"
          />
        </InputGroup>
        <GearSelect selectedGear={gearIds} onSelectedGearChange={onGear} clearable={true} width={{base: '120px', md: '180px'}} />
        <SegmentGroup.Root
          size="sm"
          value={'only' === commute ? 'only' : commute ? 'all' : 'none'}
          onValueChange={({value}) => onCommute('only' === value ? 'only' : 'all' === value)}
          hideBelow="md"
        >
          <SegmentGroup.Indicator />
          <SegmentGroup.Items items={[{value: 'all', label: 'All'}, {value: 'none', label: 'No commutes'}, {value: 'only', label: 'Commutes'}]} />
        </SegmentGroup.Root>
        <IconButton aria-label="Show private activities" variant={withPrivate ? 'surface' : 'ghost'} onClick={onPrivate} size="sm">
          <LuLock />
        </IconButton>
        <Menu.Root closeOnSelect={false}>
          <Menu.Trigger asChild={true}>
            <Button variant="ghost" size="sm" hideBelow="md">
              <LuColumns3 /> Columns
            </Button>
          </Menu.Trigger>
          <Portal>
            <Menu.Positioner>
              <Menu.Content maxHeight="360px" overflowY="auto">
                {TAGS.map(tag => (
                  <Menu.CheckboxItem
                    key={tag.sortType}
                    value={tag.sortType}
                    checked={columns.includes(tag.sortType)}
                    onCheckedChange={checked =>
                      onColumns(checked ? [...columns, tag.sortType] : columns.filter(column => column !== tag.sortType))
                    }
                  >
                    {label(tag.sortType)} {tag.help}
                    <Menu.ItemIndicator />
                  </Menu.CheckboxItem>
                ))}
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        </Menu.Root>
      </HStack>
      {/* On a phone the filters stay on one line that scrolls sideways, from edge to edge. */}
      <HStack
        gap="8px"
        flexWrap={{base: 'nowrap', md: 'wrap'}}
        overflowX={{base: 'auto', md: 'visible'}}
        marginX={{base: '-16px', md: '0'}}
        paddingX={{base: '16px', md: '0'}}
        css={{scrollbarWidth: 'none', '&::-webkit-scrollbar': {display: 'none'}, '& > *': {flexShrink: 0}}}
        // The right edge fades out, a hint that more filters are a swipe away.
        maskImage={{base: 'linear-gradient(to right, black calc(100% - 40px), transparent)', md: 'none'}}
      >
        <SegmentGroup.Root
          size="sm"
          value={groupOf(types, sports)}
          onValueChange={({value}) => {
            const group = SPORT_GROUPS.find(({value: name}) => name === value);
            if (undefined !== group) onTypes(group.pick(sports));
          }}
        >
          <SegmentGroup.Indicator />
          <SegmentGroup.Items items={SPORT_GROUPS.map(({value, label}) => ({value, label}))} />
        </SegmentGroup.Root>
        <Menu.Root closeOnSelect={false}>
          <Menu.Trigger asChild={true}>
            <Button variant="ghost" size="sm">
              <LuListFilter /> {null === types ? 'Sports' : `${types.length} ${1 === types.length ? 'sport' : 'sports'}`}
            </Button>
          </Menu.Trigger>
          <Portal>
            <Menu.Positioner>
              <Menu.Content maxHeight="380px" overflowY="auto" minWidth="240px">
                {sports.map(({sport, count}) => (
                  <Menu.CheckboxItem
                    key={sport}
                    value={sport}
                    checked={null === types || types.includes(sport as ActivityType)}
                    onCheckedChange={() => toggleSport(sport as ActivityType)}
                  >
                    <Icon as={sportIcon(sport)} /> {sportName(sport)}
                    <Text as="span" color="fg.muted" marginLeft="auto" fontSize="xs">
                      {count}
                    </Text>
                    <Menu.ItemIndicator />
                  </Menu.CheckboxItem>
                ))}
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        </Menu.Root>
        <Menu.Root>
          <Menu.Trigger asChild={true}>
            <Button variant={null === device ? 'ghost' : 'surface'} size="sm">
              <LuWatch /> {device ?? 'Devices'}
            </Button>
          </Menu.Trigger>
          <Portal>
            <Menu.Positioner>
              <Menu.Content maxHeight="380px" overflowY="auto" minWidth="240px">
                <Menu.RadioItemGroup value={device ?? ''} onValueChange={({value}) => onDevice('' === value ? null : value)}>
                  <Menu.RadioItem value="">
                    All devices
                    <Menu.ItemIndicator />
                  </Menu.RadioItem>
                  {devices.map(({device: name, count}) => (
                    <Menu.RadioItem key={name} value={name}>
                      {name}
                      <Text as="span" color="fg.muted" marginLeft="auto" fontSize="xs">
                        {count}
                      </Text>
                      <Menu.ItemIndicator />
                    </Menu.RadioItem>
                  ))}
                </Menu.RadioItemGroup>
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        </Menu.Root>
        {onClear && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            <LuFilterX /> Clear filters
          </Button>
        )}
      </HStack>
    </Stack>
  );
};

/** Activities whose name has no emoji yet, for riders who tag names with one. */
const Unprocessed = ({activities, usedEmojis}: {activities: Activity[]; usedEmojis: Set<string>}) => {
  const [emoji, setEmoji] = useState(() => getRandomUnusedEmoji(usedEmojis));

  if (0 === activities.length) return null;

  return (
    <Card padding="14px" background="brand.subtle" borderColor="brand.muted">
      <HStack justifyContent="space-between" gap="12px" flexWrap="wrap">
        <Text fontSize="sm">
          <strong>{activities.length}</strong> {1 === activities.length ? 'activity has' : 'activities have'} no emoji yet:{' '}
          {activities.slice(0, 3).map(({name}) => name).join(', ')}
        </Text>
        <Button
          size="sm"
          variant="surface"
          colorPalette="brand"
          onClick={() => {
            navigator.clipboard.writeText(emoji);
            setEmoji(getRandomUnusedEmoji(usedEmojis));
          }}
        >
          Copy an unused emoji: {emoji}
        </Button>
      </HStack>
    </Card>
  );
};

const ActivitiesPage = () => {
  const navigate = useNavigate();
  const {label} = useLabels();
  const {locale, unprocessedEmoji} = useSettings();
  const {getFtp} = useFtp();
  const {activityMeta} = useActivityMeta();
  // Filters and sort live in the address, so coming back from an activity finds them again
  // (and Records can link to a device). Defaults are left out to keep the address short.
  const [searchParams, setSearchParams] = useSearchParams();
  const setParams = (changes: Record<string, string | null>) =>
    setSearchParams(
      params => {
        Object.entries(changes).forEach(([name, value]) => (null === value ? params.delete(name) : params.set(name, value)));

        return params;
      },
      {replace: true},
    );
  const device = searchParams.get('device');
  const search = searchParams.get('q') ?? '';
  const sort = (searchParams.get('sort') ?? 'date') as SortType;
  const direction: SortDirection = 'asc' === searchParams.get('dir') ? 'asc' : 'desc';
  const gear = searchParams.get('gear');
  const gearIds = null === gear ? [] : [gear];
  const commuteParam = searchParams.get('commute');
  const commute: Commute = 'only' === commuteParam ? 'only' : 'none' !== commuteParam;
  const setDevice = (name: string | null) => setParams({device: name});
  const setSearch = (value: string) => setParams({q: '' === value ? null : value});
  const setGearIds = (ids: string[]) => setParams({gear: ids[0] ?? null});
  const setCommute = (value: Commute) => setParams({commute: 'only' === value ? 'only' : value ? null : 'none'});
  const {data: allActivities} = useAllActivities();
  const [withPrivate, setWithPrivate] = useLocalStorage('withPrivate', false);
  const [columns, setColumns] = useLocalStorage<SortType[]>('sort-types', DEFAULT_SORTS);
  const [types, setTypes] = useLocalStorage<ActivityType[] | null>('activity-types', null);
  const rowHeight = useBreakpointValue(ROW_HEIGHT) ?? ROW_HEIGHT.base;
  const isWide = useBreakpointValue({base: false, md: true}) ?? false;
  const listRef = useRef<HTMLDivElement>(null);
  // Where the list starts on the page, which the window scroll is measured from.
  const [scrollMargin, setScrollMargin] = useState(0);

  const filter = {
    search,
    sort,
    sortDirection: direction,
    gearId: gearIds[0],
    withCommute: commute,
    includedActivityTypes: types ?? undefined,
  };
  const isFiltered = '' !== search || 0 < gearIds.length || true !== commute || null !== types || null !== device;
  // Showing private activities is a preference, not a filter, so it stays as it is.
  const clearFilters = () => {
    setTypes(null);
    setParams({q: null, gear: null, commute: null, device: null});
  };
  const showsPrivate = withPrivate || '' !== search;
  // A search looks through private activities too.
  const {activities, unprocessedActivities} = useActivities({...filter, withPrivate: showsPrivate});
  // The same filters with private activities, to say how many are hidden.
  const {activities: withHidden} = useActivities({...filter, withPrivate: true});
  const hiddenPrivate = showsPrivate || null === activities ? 0 : (withHidden?.length ?? 0) - activities.length;

  // Every sport ridden, most frequent first, with how many activities it has.
  const sports = useMemo(
    () =>
      Object.entries(countBy(allActivities ?? [], ({sport_type}) => sport_type))
        .map(([sport, count]) => ({sport, count}))
        .sort((a, b) => b.count - a.count),
    [allActivities],
  );
  const usedEmojis = useMemo(
    () => new Set((allActivities ?? []).flatMap(({name}) => [...name.matchAll(/\p{Extended_Pictographic}/gu)].map(([match]) => match))),
    [allActivities],
  );
  const shownColumns = TAGS.filter(({sortType}) => columns.includes(sortType));
  // Devices are in the details; an activity whose details have not arrived yet is left out.
  const deviceOf = (id: number): string | null => {
    const detail = activityMeta[id];

    return undefined === detail ? null : detail.device_name || 'unknown';
  };
  const rows = null === device ? (activities ?? []) : (activities ?? []).filter(({id}) => device === deviceOf(id));
  const devices = Object.entries(
    countBy(
      (allActivities ?? []).filter(({id}) => null !== deviceOf(id)),
      ({id}) => deviceOf(id) ?? 'unknown',
    ),
  )
    .map(([name, count]) => ({device: name, count}))
    .sort((a, b) => b.count - a.count);

  useLayoutEffect(() => {
    const node = listRef.current;
    if (null !== node) setScrollMargin(node.getBoundingClientRect().top + window.scrollY);
  }, [rows.length, unprocessedActivities.length, isWide, columns.length]);

  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => rowHeight,
    overscan: 12,
    scrollMargin,
  });

  const sortBy = (sortType: SortType) =>
    sortType === sort
      ? setParams({dir: 'asc' === direction ? null : 'asc'})
      : setParams({sort: 'date' === sortType ? null : sortType, dir: null});

  // Back from an activity: scroll to where the list was, once it is tall enough to get there.
  const scrollTarget = useRef(rememberedScroll(searchParams.toString()));
  useLayoutEffect(() => {
    const target = scrollTarget.current;
    if (null === target || 0 === rows.length) return;

    window.scrollTo(0, target);
    if (Math.abs(window.scrollY - target) < 2) scrollTarget.current = null;
  }, [rows.length, scrollMargin]);

  const gridColumns = isWide ? `48px minmax(220px, 1fr) repeat(${shownColumns.length}, ${COLUMN_WIDTH}px)` : '52px 1fr auto';
  const minWidth = isWide ? 48 + 260 + shownColumns.length * COLUMN_WIDTH : undefined;

  return (
    <Stack gap="16px">
      <HStack justifyContent="space-between" alignItems="baseline">
        <Text fontFamily="heading" fontSize={{base: '2xl', md: '3xl'}} fontWeight="bold" letterSpacing="-0.02em">
          Activities
        </Text>
        <Text color="fg.muted" fontSize="sm">
          {null === activities ? ' ' : `${rows.length.toLocaleString(locale)} shown`}
        </Text>
      </HStack>

      <Toolbar
        search={search}
        onSearch={setSearch}
        sports={sports}
        types={types}
        onTypes={setTypes}
        gearIds={gearIds}
        onGear={setGearIds}
        commute={commute}
        onCommute={setCommute}
        withPrivate={withPrivate}
        onPrivate={() => setWithPrivate(!withPrivate)}
        columns={columns}
        onColumns={setColumns}
        devices={devices}
        device={device}
        onDevice={setDevice}
        onClear={isFiltered ? clearFilters : undefined}
        label={label}
      />

      {unprocessedEmoji && <Unprocessed activities={unprocessedActivities} usedEmojis={usedEmojis} />}

      {/* Only when filtering, or when nothing shows: unfiltered, hidden private activities are expected. */}
      {0 < hiddenPrivate && (0 === rows.length || null !== types || 0 < gearIds.length || true !== commute) && (
        <Card padding="14px">
          <HStack justifyContent="space-between" gap="12px" flexWrap="wrap">
            <HStack gap="8px" fontSize="sm">
              <LuLock />
              <Text>
                {hiddenPrivate.toLocaleString(locale)} private {1 === hiddenPrivate ? 'activity matches' : 'activities match'} but{' '}
                {1 === hiddenPrivate ? 'is' : 'are'} hidden.
              </Text>
            </HStack>
            <Button size="sm" variant="surface" onClick={() => setWithPrivate(true)}>
              Show private activities
            </Button>
          </HStack>
        </Card>
      )}

      <Card padding="0" overflowX="auto">
        <Box minWidth={minWidth ? `${minWidth}px` : undefined}>
          {isWide && (
            <Box
              display="grid"
              gridTemplateColumns={gridColumns}
              alignItems="center"
              paddingX="16px"
              paddingY="10px"
              borderBottomWidth="1px"
              fontSize="xs"
              color="fg.muted"
            >
              <Box />
              <HStack as="button" gap="4px" onClick={() => sortBy('date')} color={'date' === sort ? 'fg' : undefined}>
                Date {'date' === sort && ('asc' === direction ? <LuArrowUp /> : <LuArrowDown />)}
              </HStack>
              {shownColumns.map(tag => (
                <HStack
                  key={tag.sortType}
                  as="button"
                  gap="4px"
                  justifyContent="flex-end"
                  whiteSpace="nowrap"
                  title={tag.help}
                  onClick={() => sortBy(tag.sortType)}
                >
                  {tag.sortType === sort && ('asc' === direction ? <LuArrowUp /> : <LuArrowDown />)}
                  <span>{label(tag.sortType)}</span>
                  <Text as="span" fontFamily="figure" fontSize="sm" color={tag.sortType === sort ? 'brand.fg' : 'fg'}>
                    {0 === rows.length ? ' ' : tag.total(rows, activityMeta, getFtp)}
                  </Text>
                </HStack>
              ))}
            </Box>
          )}

          <Box ref={listRef} position="relative" height={`${virtualizer.getTotalSize()}px`}>
            {virtualizer.getVirtualItems().map(item => {
              const activity = rows[item.index];
              const meta = activityMeta[activity.id] ?? null;
              const ftp = getFtp(new Date(activity.start_date));

              return (
                <Box
                  key={activity.id}
                  position="absolute"
                  top="0"
                  left="0"
                  right="0"
                  height={`${item.size}px`}
                  transform={`translateY(${item.start - virtualizer.options.scrollMargin}px)`}
                  display="grid"
                  gridTemplateColumns={gridColumns}
                  alignItems="center"
                  gap={isWide ? '0' : '12px'}
                  paddingX="16px"
                  borderBottomWidth="1px"
                  borderColor="border/60"
                  cursor="pointer"
                  opacity={activity.private ? 0.6 : 1}
                  _hover={{background: 'bg.subtle'}}
                  onClick={() => {
                    rememberScroll(searchParams.toString());
                    navigate(`/activities/${activity.id}`, {state: {list: `/activities?${searchParams}`}});
                  }}
                >
                  <RouteThumb activity={activity} size={isWide ? 36 : 44} />
                  <Stack gap="0" minWidth="0" paddingLeft={isWide ? '12px' : '0'}>
                    <HStack gap="8px" minWidth="0">
                      <Text fontWeight="medium" truncate={true}>
                        {activity.name}
                      </Text>
                      <HighlightTags activity={activity} detail={meta} />
                    </HStack>
                    <HStack gap="5px" fontSize="xs" color="fg.muted" minWidth="0">
                      <Icon as={sportIcon(activity.sport_type)} flexShrink={0} />
                      <Text truncate={true}>
                        {sportName(activity.sport_type)} · {relativeDay(new Date(activity.start_date), locale)}
                        {activity.gear_id ? ` · ${label(activity.gear_id)}` : ''}
                        {activity.commute ? ' · commute' : ''}
                      </Text>
                    </HStack>
                  </Stack>
                  {isWide ? (
                    shownColumns.map(tag => {
                      const value = tag.excludedTypes?.includes(activity.sport_type) ? null : tag.value(activity, meta, ftp);

                      return (
                        <Text
                          key={tag.sortType}
                          textAlign="right"
                          fontFamily="figure"
                          fontSize="sm"
                          title={null === value?.tooltip || undefined === value?.tooltip ? undefined : String(value.tooltip)}
                          color={zoneTextColor(value?.colorPalette)}
                          opacity={value?.isRelevant ? 1 : 0.45}
                        >
                          {value?.label ?? ''}
                        </Text>
                      );
                    })
                  ) : (
                    <Stack gap="0" alignItems="flex-end">
                      <Text fontFamily="figure" fontWeight="semibold" fontSize="sm">
                        {0 < activity.distance ? km(activity.distance, locale) : duration(activity.moving_time)}
                      </Text>
                      <Text fontSize="xs" color="fg.muted">
                        {0 < activity.distance ? duration(activity.moving_time) : ''}
                      </Text>
                    </Stack>
                  )}
                </Box>
              );
            })}
          </Box>
          {null !== activities && 0 === rows.length && 0 === hiddenPrivate && (
            <Stack padding="32px" alignItems="center" gap="12px">
              <Text color="fg.muted">Nothing matches. Try another search or filter.</Text>
              {isFiltered && (
                <Button variant="surface" size="sm" onClick={clearFilters}>
                  <LuFilterX /> Clear filters
                </Button>
              )}
            </Stack>
          )}
        </Box>
      </Card>
    </Stack>
  );
};

export {ActivitiesPage};
