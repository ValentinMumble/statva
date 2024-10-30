import {ChangeEvent, useState} from 'react';
import {
  Collapsible,
  createListCollection,
  Group,
  HStack,
  IconButton,
  Input,
  SelectValueChangeDetails,
  Stack,
  Table,
  VStack,
} from '@chakra-ui/react';
import {BsDatabaseDown} from 'react-icons/bs';
import {HiArrowDown, HiArrowUp, HiOutlineLockClosed, HiOutlineLockOpen} from 'react-icons/hi2';
import {
  Tooltip,
  InputGroup,
  Switch,
  Skeleton,
  SelectTrigger,
  SelectRoot,
  SelectValueText,
  SelectContent,
  SelectItem,
  Tag,
} from './components/ui';
import {ActivityListItem, ActivityTypeFilter, ChartAccordion, Stats, WeekView, YearRangeSlider} from './components';
import {SortType, SortDirection, getGearEmoji, range, TAGS, DEFAULT_SORTS, DEFAULT_TYPES} from './models';
import {ActivityType} from './models/strava';
import {useActivities, useAthlete, useFtp} from './hooks';
import {MdClear, MdFilterList} from 'react-icons/md';

const BG_COLLECTION = createListCollection({
  items: [
    {
      value: 'date',
      label: '📅',
    },
    {
      value: 'power-zone',
      label: '⚡️',
    },
    {
      value: 'heart-zone',
      label: '🫀',
    },
  ],
});

const App = () => {
  const [withPrivate, setWithPrivate] = useState<boolean>(false);
  const [filtersOpen, setFiltersOpen] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [types, setTypes] = useState<ActivityType[]>(DEFAULT_TYPES);
  const [activeSort, setActiveSort] = useState<SortType>('date');
  const [displayedSorts, setDisplayedSorts] = useState<SortType[]>(DEFAULT_SORTS);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [gearIds, setGearIds] = useState<string[]>([]);
  const [bgOptions, setBgOptions] = useState<string[]>(['date']);
  const [yearRange, setYearRange] = useState<number[]>([]);

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
    setBgOptions(['date']);
    setYearRange([]);
  };
  const handleSortChange = (sortType: SortType) => () =>
    sortType === activeSort ? handleSortDirectionToggle() : setActiveSort(sortType);

  const handleGearChange = ({value}: SelectValueChangeDetails) => setGearIds(value);
  const handleBgOptionChange = ({value}: SelectValueChangeDetails) => setBgOptions(value);

  const handleSortToggle = (sortType: SortType) => () =>
    setDisplayedSorts(displayedSorts =>
      displayedSorts.includes(sortType)
        ? displayedSorts.filter(sort => sort !== sortType)
        : [...displayedSorts, sortType]
    );

  const isLoading = null === activities;

  const gearCollection = createListCollection({
    items: [...(athlete?.bikes ?? []), ...(athlete?.shoes ?? [])].map(({id}) => ({
      value: id,
      label: getGearEmoji(athlete, id),
    })),
  });
  gearCollection.items.push({value: 'null', label: '🤷'});

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
      <VStack align="stretch" flexBasis="62%" height="100vh" overflowY="scroll">
        <Collapsible.Root open={filtersOpen} onOpenChange={e => setFiltersOpen(e.open)}>
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
            <SelectRoot width="90px" collection={BG_COLLECTION} value={bgOptions} onValueChange={handleBgOptionChange}>
              <SelectTrigger>
                <SelectValueText placeholder="Select bg" />
              </SelectTrigger>
              <SelectContent>
                {BG_COLLECTION.items.map(bg => (
                  <SelectItem item={bg} key={bg.value}>
                    {bg.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </SelectRoot>
            <SelectRoot width="90px" collection={gearCollection} value={gearIds} onValueChange={handleGearChange}>
              <SelectTrigger clearable={true}>
                <SelectValueText placeholder="⚙️" />
              </SelectTrigger>
              <SelectContent>
                {gearCollection.items.map(gear => (
                  <SelectItem item={gear} key={gear.value}>
                    {gear.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </SelectRoot>
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
                    <Switch
                      size="sm"
                      colorScheme="whiteAlpha"
                      onChange={handleSortToggle(tag.sortType)}
                      checked={displayedSorts.includes(tag.sortType)}
                    />
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
                  bgOption={bgOptions[0]}
                  enabledSorts={displayedSorts}
                />
              ))
            ) : 0 === activities.length ? (
              <Table.Row>
                <Table.Cell>No activities...</Table.Cell>
              </Table.Row>
            ) : (
              activities.map(activity => (
                <ActivityListItem
                  key={activity.id}
                  athlete={athlete}
                  getFtp={getFtp}
                  activity={activity}
                  activeSort={activeSort}
                  bgOption={bgOptions[0]}
                  enabledSorts={displayedSorts}
                />
              ))
            )}
          </Table.Body>
        </Table.Root>
      </VStack>
    </Stack>
  );
};

export {App};
