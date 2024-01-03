import {ChangeEvent, useState} from 'react';
import {
  Button,
  HStack,
  Input,
  InputGroup,
  InputRightElement,
  List,
  ListItem,
  Select,
  Skeleton,
  Stack,
  Tag,
  VStack,
} from '@chakra-ui/react';
import {SortType, SORT_TYPES, SortDirection, getBikeEmoji} from './models';
import {ActivityListItem, ChartAccordion, Stats, WeekView} from './components';
import {useActivities, useAthlete} from './hooks';

const YEARS = [2024, 2023, 2018, 2017, 2016, 2015];

const App = () => {
  const [withPrivate, setWithPrivate] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [activeSort, setActiveSort] = useState<SortType>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [gearId, setGearId] = useState<string | undefined>();
  const [years, setYears] = useState<number[]>([2023, new Date().getUTCFullYear()]);

  const [activities, isLoading] = useActivities({search, sort: activeSort, withPrivate, gearId, years, sortDirection});
  const athlete = useAthlete();

  const handleSortDirectionToggle = () => setSortDirection('asc' === sortDirection ? 'desc' : 'asc');
  const handlePrivateToggle = () => setWithPrivate(!withPrivate);
  const handleSearchChange = ({target}: ChangeEvent<HTMLInputElement>) => setSearch(target.value);
  const handleSearchClear = () => {
    setWithPrivate(false);
    setSearch('');
    setActiveSort('date');
    setSortDirection('desc');
    setGearId(undefined);
    setYears([new Date().getUTCFullYear()]);
  };
  const handleSortChange = (sortType: SortType) => () =>
    sortType === activeSort ? handleSortDirectionToggle() : setActiveSort(sortType);

  const handleYearChange = ({target}: ChangeEvent<HTMLSelectElement>) =>
    setYears('' === target.value ? [] : [Number(target.value)]);
  const handleGearChange = ({target}: ChangeEvent<HTMLSelectElement>) =>
    setGearId('' === target.value ? undefined : target.value);

  return (
    <Stack padding={[2, 7]} alignItems="start" gap={5} direction={['column', 'row']}>
      <VStack align="stretch" flexBasis="38%" gap={7} width={['100vw', null]}>
        <Stats />
        <ChartAccordion />
        <WeekView />
      </VStack>
      <VStack align="stretch" flexBasis="62%">
        <InputGroup gap={1}>
          <Button variant="ghost" onClick={handleSortDirectionToggle}>
            {'asc' === sortDirection ? '⬆️' : '⬇️'}
          </Button>
          <Input
            disabled={isLoading}
            placeholder="Search"
            autoFocus={true}
            value={search}
            onChange={handleSearchChange}
          />
          <InputRightElement marginRight="65px">
            <Tag>{activities.length}</Tag>
          </InputRightElement>
          <Button variant="ghost" onClick={handleSearchClear}>
            🗑️
          </Button>
        </InputGroup>
        <HStack justifyContent="space-between">
          {Object.values(SORT_TYPES)
            .filter(sortType => !('disabled' in sortType))
            .map(sortType => (
              <Button
                key={sortType.value}
                disabled={isLoading}
                variant="ghost"
                colorScheme="orange"
                isActive={activeSort === sortType.value}
                onClick={handleSortChange(sortType.value as SortType)}
              >
                {sortType.label}
              </Button>
            ))}
          <Select placeholder="🚲" width={24} value={gearId} onChange={handleGearChange}>
            {athlete?.bikes.map(bike => (
              <option key={bike.id} value={bike.id}>
                {getBikeEmoji(athlete.bikes, bike.id)}
              </option>
            ))}
            <option value="null">🤷</option>
          </Select>
          <Select placeholder="🗓️" width={24} value={years[0]} onChange={handleYearChange}>
            {YEARS.map(year => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </Select>
          <Button variant="ghost" isActive={withPrivate} onClick={handlePrivateToggle}>
            🔒
          </Button>
        </HStack>
        <List>
          {isLoading
            ? [...new Array(20)].map((_, index) => (
                <Skeleton key={index} marginBottom="8px">
                  <ListItem>Loading</ListItem>
                </Skeleton>
              ))
            : activities.map(activity => (
                <ActivityListItem key={activity.id} activity={activity} activeSort={activeSort} />
              ))}
        </List>
      </VStack>
    </Stack>
  );
};

export {App};
