import {ChangeEvent, useState} from 'react';
import {
  Badge,
  Button,
  Collapsible,
  Group,
  HStack,
  IconButton,
  Input,
  InputGroup,
  Skeleton,
  Stack,
  Table,
  Tag,
  VStack,
} from '@chakra-ui/react';
import {BsDatabaseDown} from 'react-icons/bs';
import {HiArrowDown, HiArrowUp, HiOutlineLockClosed} from 'react-icons/hi2';
import {MdClear, MdFilterList} from 'react-icons/md';
import {PiBicycle} from 'react-icons/pi';
import {Tooltip, Switch} from '../components/ui';
import {ActivityListItem, ActivityTypeFilter, ChartAccordion, GearSelect, Stats, WeekView} from '../components';
import {SortType, SortDirection, range, TAGS, DEFAULT_SORTS, getTypes} from '../models';
import {ActivityType} from '../models/strava';
import {useActivities, useActivityMeta, useEnv, useFtp, useLabels} from '../hooks';

const DISPLAYED_ITEMS = 75;

const App = () => {
  const [withPrivate, setWithPrivate] = useState<boolean>(false);
  const [withCommute, setWithCommute] = useState<boolean | 'only'>(true);
  const [filtersOpen, setFiltersOpen] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [types, setTypes] = useState<ActivityType[] | null>(getTypes(ActivityType.Ride));
  const [activeSort, setActiveSort] = useState<SortType>('date');
  const [displayedSorts, setDisplayedSorts] = useState<SortType[]>(DEFAULT_SORTS);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [gearIds, setGearIds] = useState<string[]>([]);
  const [yearRange, setYearRange] = useState<number[]>([]);
  const [displayedItems, setDisplayedItems] = useState<number>(DISPLAYED_ITEMS);

  const [devMode, setDevMode] = useEnv();
  const [label] = useLabels();
  const [getFtp] = useFtp();
  const [activities, refetch, unprocessedActivities, deleteActivity] = useActivities({
    search,
    includedActivityTypes: types ?? undefined,
    sort: activeSort,
    withPrivate,
    withCommute,
    gearId: gearIds[0],
    years: 0 === yearRange.length ? [] : range(yearRange.at(0), yearRange.at(-1)),
    sortDirection,
  });
  const [activityMeta] = useActivityMeta();

  const handleRefetch = () => refetch(1, false, 20);
  const handleSortDirectionToggle = () => setSortDirection('asc' === sortDirection ? 'desc' : 'asc');
  const handlePrivateToggle = () => setWithPrivate(!withPrivate);
  const handleSearchChange = ({target}: ChangeEvent<HTMLInputElement>) => setSearch(target.value);
  const handleResetFilters = () => {
    setFiltersOpen(false);
    setWithPrivate(false);
    setWithCommute(true);
    setSearch('');
    setTypes(getTypes(ActivityType.Ride));
    setActiveSort('date');
    setDisplayedSorts(DEFAULT_SORTS);
    setSortDirection('desc');
    setGearIds([]);
    setYearRange([]);
    setDisplayedItems(DISPLAYED_ITEMS);
  };
  const handleSortChange = (sortType: SortType) => () =>
    sortType === activeSort ? handleSortDirectionToggle() : setActiveSort(sortType);
  const handleDisplayMoreItems = () => setDisplayedItems(displayedItems => displayedItems + DISPLAYED_ITEMS);

  const handleSortToggle = (sortType: SortType) => () =>
    setDisplayedSorts(displayedSorts =>
      displayedSorts.includes(sortType)
        ? displayedSorts.filter(sort => sort !== sortType)
        : [...displayedSorts, sortType]
    );

  const handleBikeOnlyToggle = () =>
    setTypes(types?.every(type => getTypes(ActivityType.Ride).includes(type)) ? null : getTypes(ActivityType.Ride));

  const isLoading = null === activities;

  return (
    <Stack padding={[undefined, '0 20px']} gap="20px" direction={['column-reverse', 'row']}>
      <VStack align="stretch" flexBasis="40%" gap="20px" width={['100vw', null]} height="100vh" overflowY="scroll">
        <Stats />
        <ChartAccordion />
        <WeekView />
      </VStack>
      <VStack align="stretch" flexBasis="60%" height="100vh" overflow="scroll">
        <Collapsible.Root open={filtersOpen} onOpenChange={({open}) => setFiltersOpen(open)}>
          <Group width="full">
            {import.meta.env.DEV && (
              <Switch
                size="xs"
                title="Use local"
                checked={devMode}
                onCheckedChange={({checked}) => setDevMode(checked)}
              />
            )}
            <InputGroup
              flex={1}
              endElement={
                <>
                  <IconButton title="Clear" variant="ghost" size="xs" onClick={handleResetFilters}>
                    <MdClear />
                  </IconButton>
                  {activities?.length ?? 0}
                </>
              }
            >
              <Input
                disabled={isLoading}
                placeholder={devMode ? 'DEV MODE ☞ USING LOCAL ACTIVITIES' : 'Search'}
                autoFocus={true}
                value={search}
                onChange={handleSearchChange}
              />
            </InputGroup>
            <GearSelect selectedGear={gearIds} onSelectedGearChange={setGearIds} clearable={true} />
            <IconButton title="With private" variant={withPrivate ? 'surface' : 'ghost'} onClick={handlePrivateToggle}>
              <HiOutlineLockClosed />
            </IconButton>
            <Group hideBelow="md">
              <IconButton
                title="Bike only"
                variant={types?.every(type => getTypes(ActivityType.Ride).includes(type)) ? 'surface' : 'ghost'}
                onClick={handleBikeOnlyToggle}
              >
                <PiBicycle />
              </IconButton>
              <IconButton variant="ghost" onClick={handleRefetch}>
                <BsDatabaseDown />
              </IconButton>
              <Collapsible.Trigger>
                <IconButton
                  transition="rotate ease .2s"
                  rotate={filtersOpen ? '180deg' : undefined}
                  variant="ghost"
                  as="span"
                >
                  <MdFilterList />
                </IconButton>
              </Collapsible.Trigger>
            </Group>
          </Group>
          <Collapsible.Content padding="15px 0" display="flex" flexDirection="column" gap="20px">
            <HStack justifyContent="space-between">
              <ActivityTypeFilter
                types={types}
                onTypesChange={setTypes}
                withCommute={withCommute}
                onWithCommuteChange={setWithCommute}
              />
            </HStack>
            <HStack justifyContent="space-between">
              {TAGS.map(tag => (
                <Tooltip key={tag.sortType} content={tag.help}>
                  <Button
                    size="xs"
                    variant={displayedSorts.includes(tag.sortType) ? 'surface' : 'ghost'}
                    onClick={handleSortToggle(tag.sortType)}
                  >
                    {label(tag.sortType)}
                  </Button>
                </Tooltip>
              ))}
            </HStack>
          </Collapsible.Content>
        </Collapsible.Root>
        <Table.Root unstyled={true}>
          <Table.Header hideBelow="md">
            <Table.Row fontSize=".8em" cursor="pointer">
              <Table.ColumnHeader />
              <Table.ColumnHeader>
                <VStack>
                  <span onClick={handleSortDirectionToggle}>
                    {'asc' === sortDirection ? <HiArrowUp /> : <HiArrowDown />}
                  </span>
                  <span onClick={handleSortChange('date')}>📅</span>
                </VStack>
              </Table.ColumnHeader>
              {TAGS.filter(({sortType}) => displayedSorts.includes(sortType)).map(tag => (
                <Table.ColumnHeader key={tag.sortType} onClick={handleSortChange(tag.sortType)}>
                  {isLoading ? (
                    <Skeleton margin="0 5px">i</Skeleton>
                  ) : (
                    <VStack>
                      <Tag.Root colorPalette={tag.sortType === activeSort ? 'orange' : 'gray'} variant="subtle">
                        <Tag.Label>{tag.total(activities, getFtp)}</Tag.Label>
                      </Tag.Root>
                      {label(tag.sortType)}
                    </VStack>
                  )}
                </Table.ColumnHeader>
              ))}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {isLoading ? (
              [...new Array(20)].map((_, index) => (
                <ActivityListItem key={index} getFtp={getFtp} activity={null} enabledSorts={displayedSorts} />
              ))
            ) : 0 === activities.length ? (
              <Table.Row>
                <Table.Cell>No activities... 🏜️</Table.Cell>
              </Table.Row>
            ) : (
              <>
                {unprocessedActivities.length > 0 && (
                  <>
                    <Table.Row>
                      <Table.Cell />
                      <Table.Cell>
                        <Badge>Unprocessed</Badge>
                      </Table.Cell>
                    </Table.Row>
                    {unprocessedActivities.map(activity => (
                      <ActivityListItem
                        key={activity.id}
                        getFtp={getFtp}
                        activity={activity}
                        fullActivity={activityMeta[activity.id] ?? null}
                        enabledSorts={displayedSorts}
                        showDeleteButton={true}
                        onDeleteActivity={deleteActivity}
                      />
                    ))}
                    <Table.Row>
                      <Table.Cell />
                      <Table.Cell>&nbsp;</Table.Cell>
                    </Table.Row>
                  </>
                )}
                {activities.slice(0, displayedItems).map(activity => (
                  <ActivityListItem
                    key={activity.id}
                    getFtp={getFtp}
                    activity={activity}
                    fullActivity={activityMeta[activity.id] ?? null}
                    enabledSorts={displayedSorts}
                  />
                ))}
              </>
            )}
            {(activities?.length ?? 0) > displayedItems && (
              <Table.Row>
                <Table.Cell />
                <Table.Cell textAlign="center" padding="10px">
                  <Button variant="outline" onClick={handleDisplayMoreItems}>
                    More
                  </Button>
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table.Root>
      </VStack>
    </Stack>
  );
};

export {App};
