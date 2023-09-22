import {ChangeEvent, useState} from 'react';
import {
  Input,
  Heading,
  Spinner,
  Stack,
  VStack,
  Box,
  Center,
  List,
  Button,
  InputRightElement,
  InputGroup,
  Tag,
  HStack,
  Select,
} from '@chakra-ui/react';
import {SortType, SORT_TYPES, GEARS, YEARS, SortDirection, formatDuration, formatDistance} from './models';
import {ActivityListItem, YearChart, GearChart, ProgressChart, Stats} from './components';
import {useActivities} from './hooks';

const DEFAULT_SORT: SortType = 'date';

const App = () => {
  const [withCommute, setWithCommute] = useState<boolean>(true);
  const [withPrivate, setWithPrivate] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [activeSort, setActiveSort] = useState<SortType>(DEFAULT_SORT);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [gearId, setGearId] = useState<string | undefined>();
  const [year, setYear] = useState<number | undefined>(new Date().getUTCFullYear());

  const activities = useActivities({search, withCommute, sort: activeSort, withPrivate, gearId, year, sortDirection});

  const handleCommuteToggle = () => setWithCommute(!withCommute);
  const handlePrivateToggle = () => setWithPrivate(!withPrivate);
  const handleSearchChange = ({target}: ChangeEvent<HTMLInputElement>) => setSearch(target.value);
  const handleSearchClear = () => setSearch('');
  const handleSortChange = (sortType: SortType) => () => setActiveSort(sortType);
  const handleSortDirectionToggle = () => setSortDirection('asc' === sortDirection ? 'desc' : 'asc');

  const handleYearChange = ({target}: ChangeEvent<HTMLSelectElement>) =>
    setYear('' === target.value ? undefined : Number(target.value));
  const handleGearChange = ({target}: ChangeEvent<HTMLSelectElement>) =>
    setGearId('' === target.value ? undefined : target.value);

  if (null === activities) {
    return (
      <Center height="full" flexDirection="column" gap={10}>
        <Heading as="h1" size="lg">
          Fetching activities
        </Heading>
        <Spinner color="orange.500" />
      </Center>
    );
  }

  return (
    <Box padding={10}>
      <HStack alignItems="baseline" gap={10}>
        <VStack align="stretch" flex={1}>
          <Stats />
          <ProgressChart search="N-Peloton" />
          <YearChart data="distance" title="Distance / year 🗺️" formatter={value => formatDistance(value)} />
          <YearChart
            data="total_elevation_gain"
            title="Elevation / year ⛰️"
            formatter={value => formatDistance(value)}
          />
          <GearChart data="distance" title="Distance / gear 🚲" formatter={value => formatDistance(value)} />
          <GearChart data="moving_time" title="Time / gear ⏱️" formatter={value => formatDuration(value)} />
        </VStack>
        <VStack align="stretch" flex={1}>
          <InputGroup gap={1}>
            <Button variant="ghost" onClick={handleSortDirectionToggle}>
              {'asc' === sortDirection ? '⬆️' : '⬇️'}
            </Button>
            <Input placeholder="Search" autoFocus={true} value={search} onChange={handleSearchChange} />
            <InputRightElement marginRight="65px">
              <Tag>{activities.length}</Tag>
            </InputRightElement>
            <Button variant="ghost" onClick={handleSearchClear}>
              🗑️
            </Button>
          </InputGroup>
          <Stack direction={['row']} alignSelf="center">
            {Object.values(SORT_TYPES).map(sortType => (
              <Button
                key={sortType.value}
                variant="ghost"
                colorScheme="orange"
                isActive={activeSort === sortType.value}
                onClick={handleSortChange(sortType.value as SortType)}
              >
                {sortType.label}
              </Button>
            ))}
            <Select placeholder="🚲" width={24} value={gearId} onChange={handleGearChange}>
              {Object.values(GEARS).map(({value, label}) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Select placeholder="🗓️" width={24} value={year} onChange={handleYearChange}>
              {YEARS.map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </Select>
            <Button variant="ghost" isActive={withPrivate} onClick={handlePrivateToggle}>
              🔒
            </Button>
            <Button variant="ghost" isActive={withCommute} onClick={handleCommuteToggle}>
              💼
            </Button>
          </Stack>
          <List>
            {activities.map(activity => (
              <ActivityListItem key={activity.id} activity={activity} activeSort={activeSort} />
            ))}
          </List>
        </VStack>
      </HStack>
    </Box>
  );
};

export {App};
