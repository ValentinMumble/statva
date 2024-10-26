import {ChangeEvent, useState} from 'react';
import {HStack, Input, Stack, Table, VStack} from '@chakra-ui/react';
import {Tooltip, Button, InputGroup, NativeSelectRoot, Tag, NativeSelectField, Switch, Skeleton} from './components/ui';
import {SortType, SortDirection, getGearEmoji, range, TAGS, DEFAULT_SORTS, DEFAULT_TYPES} from './models';
import {ActivityType} from './models/strava';
import {ActivityListItem, ActivityTypeFilter, ChartAccordion, Stats, WeekView, YearRangeSlider} from './components';
import {useActivities, useAthlete, useFtp} from './hooks';

const App = () => {
  const [withPrivate, setWithPrivate] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [types, setTypes] = useState<ActivityType[]>(DEFAULT_TYPES);
  const [activeSort, setActiveSort] = useState<SortType>('date');
  const [displayedSorts, setDisplayedSorts] = useState<SortType[]>(DEFAULT_SORTS);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [gearId, setGearId] = useState<string | undefined>();
  const [yearRange, setYearRange] = useState<number[]>([]);
  const [bgOption, setBgOption] = useState<string>('date');

  const athlete = useAthlete();
  const getFtp = useFtp();
  const [activities, refetch] = useActivities({
    search,
    includedActivityTypes: types,
    sort: activeSort,
    withPrivate,
    gearId,
    years: 0 === yearRange.length ? [] : range(yearRange.at(0), yearRange.at(-1)),
    sortDirection,
  });

  const handleRefetch = () => refetch(1, false, 20);
  const handleSortDirectionToggle = () => setSortDirection('asc' === sortDirection ? 'desc' : 'asc');
  const handlePrivateToggle = () => setWithPrivate(!withPrivate);
  const handleSearchChange = ({target}: ChangeEvent<HTMLInputElement>) => setSearch(target.value);
  const handleSearchClear = () => {
    setWithPrivate(false);
    setSearch('');
    setTypes(DEFAULT_TYPES);
    setActiveSort('date');
    setDisplayedSorts(DEFAULT_SORTS);
    setSortDirection('desc');
    setGearId(undefined);
    setYearRange([]);
    setBgOption('date');
  };
  const handleSortChange = (sortType: SortType) => () =>
    sortType === activeSort ? handleSortDirectionToggle() : setActiveSort(sortType);
  const handleGearChange = ({target}: ChangeEvent<HTMLSelectElement>) =>
    setGearId('' === target.value ? undefined : target.value);
  const handleBgOptionChange = ({target}: ChangeEvent<HTMLSelectElement>) => setBgOption(target.value);
  const handleSortToggle = (sortType: SortType) => () =>
    setDisplayedSorts(displayedSorts =>
      displayedSorts.includes(sortType)
        ? displayedSorts.filter(sort => sort !== sortType)
        : [...displayedSorts, sortType]
    );

  const isLoading = null === activities;

  return (
    <Stack padding="0 20px" alignItems="start" gap={5} direction={['column-reverse', 'row']}>
      <VStack align="stretch" flexBasis="38%" gap={7} width={['100vw', null]} height="100vh" overflowY="scroll">
        <Stats />
        <ChartAccordion />
        <WeekView />
      </VStack>
      <VStack align="stretch" flexBasis="62%" height="100vh" overflowY="scroll">
        <HStack gap="5px">
          <Button variant="ghost" onClick={handleRefetch}>
            🔄
          </Button>
          <Button variant="ghost" onClick={handleSortDirectionToggle}>
            {'asc' === sortDirection ? '⬆️' : '⬇️'}
          </Button>
          <InputGroup endElement={<Tag>{activities?.length ?? 0}</Tag>}>
            <Input
              disabled={isLoading}
              placeholder={import.meta.env.DEV ? 'DEV MODE ☞ USING LOCAL ACTIVITIES' : 'Search'}
              autoFocus={true}
              value={search}
              onChange={handleSearchChange}
            />
          </InputGroup>
          <NativeSelectRoot>
            <NativeSelectField width="120px" value={bgOption} onChange={handleBgOptionChange}>
              <option value="date">📅</option>
              <option value="power-zone">⚡️</option>
              <option value="heart-zone">🫀</option>
            </NativeSelectField>
          </NativeSelectRoot>
          <NativeSelectRoot>
            <NativeSelectField width="120px" placeholder="⚙️" value={gearId} onChange={handleGearChange}>
              {null !== athlete &&
                [...athlete.bikes, ...athlete.shoes].map(({id}) => (
                  <option key={id} value={id}>
                    {getGearEmoji(athlete, id)}
                  </option>
                ))}
              <option value="null">🤷</option>
            </NativeSelectField>
          </NativeSelectRoot>
          <Button variant={withPrivate ? 'ghost' : 'outline'} onClick={handlePrivateToggle}>
            🔒
          </Button>
          <Button variant="ghost" onClick={handleSearchClear}>
            🗑️
          </Button>
        </HStack>
        {/* <ActivityTypeFilter types={types} onTypesChange={setTypes} /> */}
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
        <Table.Root size="sm" whiteSpace="nowrap">
          <Table.Header position="sticky" top={0}>
            <Table.Row cursor="pointer">
              <Table.ColumnHeader />
              <Table.ColumnHeader padding="5px 0" textAlign="center" onClick={handleSortChange('date')}>
                📅
              </Table.ColumnHeader>
              {TAGS.filter(({sortType}) => displayedSorts.includes(sortType)).map(tag => (
                <Tooltip content={tag.help}>
                  <Table.ColumnHeader
                    key={tag.sortType}
                    onClick={handleSortChange(tag.sortType)}
                    padding="5px 0"
                    textAlign="center"
                  >
                    {tag.emoji}
                  </Table.ColumnHeader>
                </Tooltip>
              ))}
            </Table.Row>
            <Table.Row>
              <Table.ColumnHeader />
              <Table.ColumnHeader />
              {TAGS.filter(({sortType}) => displayedSorts.includes(sortType)).map(tag => (
                <Table.ColumnHeader
                  key={tag.sortType}
                  padding="5px 0"
                  textAlign="center"
                  textTransform="inherit"
                  fontWeight="inherit"
                >
                  {isLoading ? <Skeleton margin="0 5px">i</Skeleton> : tag.total?.(activities)}
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
                  bgOption={bgOption}
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
