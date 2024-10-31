import {ChangeEvent, useState} from 'react';
import {
  Button,
  Collapsible,
  Group,
  HStack,
  IconButton,
  Input,
  SegmentGroupValueChangeDetails,
  Stack,
  Table,
  VStack,
} from '@chakra-ui/react';
import {BsDatabaseDown} from 'react-icons/bs';
import {HiArrowDown, HiArrowUp, HiOutlineLockClosed, HiOutlineLockOpen} from 'react-icons/hi2';
import {MdClear, MdFilterList} from 'react-icons/md';
import {Tooltip, InputGroup, Switch, Skeleton, Tag, SegmentedControl} from './components/ui';
import {
  ActivityListItem,
  ActivityTypeFilter,
  ChartAccordion,
  GearSelect,
  Stats,
  WeekView,
  YearRangeSlider,
} from './components';
import {SortType, SortDirection, range, TAGS, DEFAULT_SORTS, DEFAULT_TYPES, labelCollection} from './models';
import {ActivityType} from './models/strava';
import {useActivities, useAthlete, useFtp, useLabels} from './hooks';

const DISPLAYED_ITEMS = 75;
const BG_COLLECTION = ['date', 'power-zone', 'heart-zone'];

const App = () => {
  const [withPrivate, setWithPrivate] = useState<boolean>(false);
  const [filtersOpen, setFiltersOpen] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [types, setTypes] = useState<ActivityType[]>(DEFAULT_TYPES);
  const [activeSort, setActiveSort] = useState<SortType>('date');
  const [displayedSorts, setDisplayedSorts] = useState<SortType[]>(DEFAULT_SORTS);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [gearIds, setGearIds] = useState<string[]>([]);
  const [bgOption, setBgOption] = useState<string>('date');
  const [yearRange, setYearRange] = useState<number[]>([]);
  const [displayedItems, setDisplayedItems] = useState<number>(DISPLAYED_ITEMS);

  const [label] = useLabels();
  const athlete = useAthlete();
  const getFtp = useFtp();
  const [activities, refetch] = useActivities({
    search,
    includedActivityTypes: types,
    sort: activeSort,
    withPrivate,
    gearId: gearIds[0],
    years: 0 === yearRange.length ? [] : range(yearRange.at(0), yearRange.at(-1)),
    sortDirection,
  });

  const handleRefetch = () => refetch(1, false, 20);
  const handleSortDirectionToggle = () => setSortDirection('asc' === sortDirection ? 'desc' : 'asc');
  const handlePrivateToggle = () => setWithPrivate(!withPrivate);
  const handleSearchChange = ({target}: ChangeEvent<HTMLInputElement>) => setSearch(target.value);
  const handleSearchClear = () => {
    setFiltersOpen(false);
    setWithPrivate(false);
    setSearch('');
    setTypes(DEFAULT_TYPES);
    setActiveSort('date');
    setDisplayedSorts(DEFAULT_SORTS);
    setSortDirection('desc');
    setGearIds([]);
    setBgOption('date');
    setYearRange([]);
    setDisplayedItems(DISPLAYED_ITEMS);
  };
  const handleSortChange = (sortType: SortType) => () =>
    sortType === activeSort ? handleSortDirectionToggle() : setActiveSort(sortType);
  const handleBgOptionChange = ({value}: SegmentGroupValueChangeDetails) => setBgOption(value);
  const handleDisplayMoreItems = () => setDisplayedItems(displayedItems => displayedItems + DISPLAYED_ITEMS);

  const handleSortToggle = (sortType: SortType) => () =>
    setDisplayedSorts(displayedSorts =>
      displayedSorts.includes(sortType)
        ? displayedSorts.filter(sort => sort !== sortType)
        : [...displayedSorts, sortType]
    );

  const isLoading = null === activities;

  return (
    <Stack padding="0 20px" gap="20px" direction={['column-reverse', 'row']}>
      <VStack
        padding="10px 0"
        align="stretch"
        flexBasis="38%"
        gap="20px"
        width={['100vw', null]}
        height="100vh"
        overflowY="scroll"
      >
        <Stats />
        <ChartAccordion />
        <WeekView />
      </VStack>
      <VStack align="stretch" flexBasis="62%" height="100vh" overflow="scroll">
        <Collapsible.Root open={filtersOpen} onOpenChange={({open}) => setFiltersOpen(open)}>
          <Group width="full">
            <InputGroup
              flex={1}
              endElement={
                <>
                  <IconButton variant="ghost" size="xs" onClick={handleSearchClear}>
                    <MdClear />
                  </IconButton>
                  {activities?.length ?? 0}
                </>
              }
            >
              <Input
                disabled={isLoading}
                placeholder={import.meta.env.DEV ? 'DEV MODE ☞ USING LOCAL ACTIVITIES' : 'Search'}
                autoFocus={true}
                value={search}
                onChange={handleSearchChange}
              />
            </InputGroup>
            <SegmentedControl
              value={bgOption}
              onValueChange={handleBgOptionChange}
              items={labelCollection(BG_COLLECTION, label).items}
            />
            <GearSelect athlete={athlete} selectedGear={gearIds} onSelectedGearChange={setGearIds} />
            <IconButton variant="ghost" onClick={handlePrivateToggle} title="With private">
              {withPrivate ? <HiOutlineLockClosed /> : <HiOutlineLockOpen />}
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
          <Collapsible.Content padding="20px 0">
            <ActivityTypeFilter types={types} onTypesChange={setTypes} />
            <YearRangeSlider value={yearRange} onChange={setYearRange} />
            <HStack justifyContent="space-between">
              {TAGS.map(tag => (
                <Tooltip key={tag.sortType} content={tag.help}>
                  <VStack cursor="pointer" onClick={handleSortToggle(tag.sortType)}>
                    <span>{tag.emoji}</span>
                    <Switch size="xs" checked={displayedSorts.includes(tag.sortType)} />
                  </VStack>
                </Tooltip>
              ))}
            </HStack>
          </Collapsible.Content>
        </Collapsible.Root>
        <Table.Root unstyled={true}>
          <Table.Header position="sticky" top={0}>
            <Table.Row>
              <Table.ColumnHeader />
              <Table.ColumnHeader>
                <IconButton variant="ghost" size="xs" onClick={handleSortDirectionToggle}>
                  {'asc' === sortDirection ? <HiArrowUp /> : <HiArrowDown />}
                </IconButton>
              </Table.ColumnHeader>
              {TAGS.filter(({sortType}) => displayedSorts.includes(sortType)).map(tag => (
                <Table.ColumnHeader key={tag.sortType} padding="6px 0">
                  {isLoading ? (
                    <Skeleton margin="0 5px">i</Skeleton>
                  ) : (
                    <Tag variant="subtle">{tag.total?.(activities)}</Tag>
                  )}
                </Table.ColumnHeader>
              ))}
            </Table.Row>
            <Table.Row cursor="pointer" fontSize=".8em">
              <Table.ColumnHeader />
              <Table.ColumnHeader onClick={handleSortChange('date')}>📅</Table.ColumnHeader>
              {TAGS.filter(({sortType}) => displayedSorts.includes(sortType)).map(tag => (
                <Table.ColumnHeader key={tag.sortType} title={tag.help} onClick={handleSortChange(tag.sortType)}>
                  {tag.emoji}
                </Table.ColumnHeader>
              ))}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {isLoading ? (
              [...new Array(20)].map((_, index) => (
                <ActivityListItem
                  key={index}
                  athlete={athlete}
                  getFtp={getFtp}
                  activity={null}
                  bgOption={bgOption}
                  enabledSorts={displayedSorts}
                />
              ))
            ) : 0 === activities.length ? (
              <Table.Row>
                <Table.Cell>No activities... 🏜️</Table.Cell>
              </Table.Row>
            ) : (
              activities
                .slice(0, displayedItems)
                .map(activity => (
                  <ActivityListItem
                    key={activity.id}
                    athlete={athlete}
                    getFtp={getFtp}
                    activity={activity}
                    activeSort={activeSort}
                    bgOption={bgOption}
                    enabledSorts={displayedSorts}
                  />
                ))
            )}
            {(activities?.length ?? 0) > displayedItems && (
              <Table.Row>
                <Table.Cell />
                <Table.Cell textAlign="center" padding="20px">
                  <Button variant="subtle" onClick={handleDisplayMoreItems}>
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
