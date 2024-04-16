import {ChangeEvent, useState} from 'react';
import {
  Button,
  Checkbox,
  CheckboxGroup,
  HStack,
  Input,
  InputGroup,
  InputRightElement,
  Select,
  Stack,
  Table,
  Tag,
  Tbody,
  Th,
  Thead,
  Tr,
  VStack,
} from '@chakra-ui/react';
import {SortType, SortDirection, getBikeEmoji, range, TAGS, DEFAULT_SORTS} from './models';
import {ActivityListItem, ChartAccordion, Stats, WeekView, YearRangeSlider} from './components';
import {useActivities, useAthlete} from './hooks';

const App = () => {
  const [withPrivate, setWithPrivate] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [activeSort, setActiveSort] = useState<SortType>('date');
  const [displayedSorts, setDisplayedSorts] = useState<SortType[]>(DEFAULT_SORTS);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [gearId, setGearId] = useState<string | undefined>();
  const [yearRange, setYearRange] = useState<number[]>([]);
  const [bgOption, setBgOption] = useState<string>('date');

  const athlete = useAthlete();
  const [activities, isLoading] = useActivities({
    search,
    sort: activeSort,
    withPrivate,
    gearId,
    years: 0 === yearRange.length ? [] : range(yearRange.at(0), yearRange.at(-1)),
    sortDirection,
  });

  const handleSortDirectionToggle = () => setSortDirection('asc' === sortDirection ? 'desc' : 'asc');
  const handlePrivateToggle = () => setWithPrivate(!withPrivate);
  const handleSearchChange = ({target}: ChangeEvent<HTMLInputElement>) => setSearch(target.value);
  const handleSearchClear = () => {
    setWithPrivate(false);
    setSearch('');
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

  return (
    <Stack padding={[2, 7]} alignItems="start" gap={5} direction={['column-reverse', 'row']}>
      <VStack align="stretch" flexBasis="38%" gap={7} width={['100vw', null]}>
        <Stats />
        <ChartAccordion />
        <WeekView />
      </VStack>
      <VStack align="stretch" flexBasis="62%">
        <InputGroup gap={3}>
          <Button variant="ghost" onClick={handleSortDirectionToggle}>
            {'asc' === sortDirection ? '⬆️' : '⬇️'}
          </Button>
          <InputGroup>
            <Input
              disabled={isLoading}
              placeholder="Search"
              autoFocus={true}
              value={search}
              onChange={handleSearchChange}
            />
            <InputRightElement marginRight="5px">
              <Tag>{activities.length}</Tag>
            </InputRightElement>
          </InputGroup>
          <Select width="120px" value={bgOption} onChange={handleBgOptionChange}>
            <option value="date">📅</option>
            <option value="power-zone">⚡️</option>
            <option value="heart-zone">🫀</option>
          </Select>
          <Select width="120px" placeholder="🚲" value={gearId} onChange={handleGearChange}>
            {athlete?.bikes.map(({id}) => (
              <option key={id} value={id}>
                {getBikeEmoji(athlete.bikes, id)}
              </option>
            ))}
            <option value="null">🤷</option>
          </Select>
          <Button variant="ghost" isActive={withPrivate} onClick={handlePrivateToggle}>
            🔒
          </Button>
          <Button variant="ghost" onClick={handleSearchClear}>
            🗑️
          </Button>
        </InputGroup>
        <YearRangeSlider value={yearRange} onChange={setYearRange} />
        <HStack justifyContent="space-between">
          <CheckboxGroup
            colorScheme="orange"
            value={displayedSorts}
            onChange={newSorts => setDisplayedSorts(newSorts as SortType[])}
          >
            {TAGS.map(tag => (
              <Checkbox key={tag.sortType} value={tag.sortType}>
                {tag.emoji}
              </Checkbox>
            ))}
          </CheckboxGroup>
        </HStack>
        <Table size="sm" variant="unstyled" whiteSpace="nowrap">
          <Thead>
            <Tr cursor="pointer">
              <Th />
              <Th padding="5px 0" textAlign="center" onClick={handleSortChange('date')}>
                📅
              </Th>
              {TAGS.filter(({sortType}) => displayedSorts.includes(sortType)).map(tag => (
                <Th key={tag.sortType} onClick={handleSortChange(tag.sortType)} padding="5px 0" textAlign="center">
                  {tag.emoji}
                </Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            {isLoading
              ? [...new Array(15)].map((_, index) => (
                  <ActivityListItem key={index} activity={null} bgOption={bgOption} />
                ))
              : activities.map(activity => (
                  <ActivityListItem
                    key={activity.id}
                    activity={activity}
                    activeSort={activeSort}
                    bgOption={bgOption}
                    enabledSorts={displayedSorts}
                  />
                ))}
          </Tbody>
        </Table>
      </VStack>
    </Stack>
  );
};

export {App};
