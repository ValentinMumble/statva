import {ChangeEvent, KeyboardEvent, useMemo, useState} from 'react';
import {Stack, VStack} from '@chakra-ui/react';
import {useLocalStorage} from 'usehooks-ts';
import {ActivityTable, BikeParts, ChartAccordion, FilterControls, Stats, WeekView} from '../components';
import {SortType, SortDirection, DEFAULT_SORTS, getTypes, extractEmoji} from '../models';
import {ActivityType} from '../models/strava';
import {useActivities, useActivityMeta, useFtp, useLabels, useAllActivities} from '../hooks';

const App = () => {
  const [withPrivate, setWithPrivate] = useLocalStorage<boolean>('withPrivate', false);
  const [withCommute, setWithCommute] = useState<boolean | 'only'>(true);
  const [search, setSearch] = useState<string>('');
  const [activeSort, setActiveSort] = useState<SortType>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [gearIds, setGearIds] = useState<string[]>([]);

  const [displayedSorts, setDisplayedSorts] = useLocalStorage<SortType[]>('sort-types', DEFAULT_SORTS);
  const [types, setTypes] = useLocalStorage<ActivityType[] | null>('activity-types', getTypes(ActivityType.Ride));

  const {label} = useLabels();
  const {getFtp} = useFtp();
  const {activities, refetch, unprocessedActivities, deleteActivity} = useActivities({
    search,
    includedActivityTypes: types ?? undefined,
    sort: activeSort,
    withPrivate,
    withCommute,
    gearId: gearIds[0],
    sortDirection,
  });
  const {activityMeta} = useActivityMeta();
  const {data: allActivities} = useAllActivities();

  const usedEmojis = useMemo(
    () => new Set((allActivities ?? []).flatMap(({name}) => [...extractEmoji(name)])),
    [allActivities],
  );

  const handleRefetch = () => refetch();
  const handleSortDirectionToggle = () => setSortDirection('asc' === sortDirection ? 'desc' : 'asc');
  const handlePrivateToggle = () => setWithPrivate(!withPrivate);
  const handleSearchChange = ({target}: ChangeEvent<HTMLInputElement>) => {
    setWithPrivate('' !== target.value);
    setSearch(target.value);
  };
  const handleResetFilters = () => {
    setWithPrivate(false);
    setWithCommute(true);
    setSearch('');
    setActiveSort('date');
    setSortDirection('desc');
    setGearIds([]);
  };
  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      handleResetFilters();
    }
  };

  const handleSortChange = (sortType: SortType) => () =>
    sortType === activeSort ? handleSortDirectionToggle() : setActiveSort(sortType);

  const handleSortToggle = (sortType: SortType) => () =>
    setDisplayedSorts(displayedSorts =>
      displayedSorts.includes(sortType)
        ? displayedSorts.filter(sort => sort !== sortType)
        : [...displayedSorts, sortType]
    );

  const handleBikeOnlyToggle = () =>
    setTypes(types?.every(type => getTypes(ActivityType.Ride).includes(type)) ? null : getTypes(ActivityType.Ride));

  return (
    <Stack padding={[undefined, '0 20px']} gap="20px" direction={['column-reverse', 'row']}>
      <VStack align="stretch" flexBasis="40%" gap="20px" width={['100vw', null]} height="100vh" overflowY="scroll">
        <Stats />
        <BikeParts />
        <ChartAccordion />
        <WeekView />
      </VStack>
      <VStack align="stretch" flexBasis="60%" height="100vh" overflow="scroll" data-scroll-root>
        <FilterControls
          search={search}
          isLoading={null === activities}
          activityCount={activities?.length ?? 0}
          withPrivate={withPrivate}
          withCommute={withCommute}
          types={types}
          gearIds={gearIds}
          displayedSorts={displayedSorts}
          label={label}
          onSearchChange={handleSearchChange}
          onSearchKeyDown={handleSearchKeyDown}
          onResetFilters={handleResetFilters}
          onPrivateToggle={handlePrivateToggle}
          onBikeOnlyToggle={handleBikeOnlyToggle}
          onRefetch={handleRefetch}
          onGearChange={setGearIds}
          onTypesChange={setTypes}
          onWithCommuteChange={setWithCommute}
          onSortToggle={handleSortToggle}
        />
        <ActivityTable
          activities={activities}
          unprocessedActivities={unprocessedActivities}
          activityMeta={activityMeta}
          displayedSorts={displayedSorts}
          activeSort={activeSort}
          sortDirection={sortDirection}
          getFtp={getFtp}
          label={label}
          usedEmojis={usedEmojis}
          onSortChange={handleSortChange}
          onSortDirectionToggle={handleSortDirectionToggle}
          onDeleteActivity={deleteActivity}
        />
      </VStack>
    </Stack>
  );
};

export {App};
