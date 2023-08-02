import {ChangeEvent, useState} from 'react';
import {
  Checkbox,
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
import {SortType, SORT_TYPES} from './models';
import {ActivityListItem, DistanceChart, ProgressChart, Stats} from './components';
import {useActivities} from './hooks';

const DEFAULT_SORT: SortType = 'date';

const GEARS: {label: string; value: string}[] = [
  {
    value: 'b12655849',
    label: '🐈‍⬛',
  },
  {
    value: 'b11897955',
    label: '🦖',
  },
  {
    value: 'b3121762',
    label: '🐝',
  },
  {
    value: 'b2391730',
    label: '🦎',
  },
  {
    value: 'b2417181',
    label: '🫐',
  },
];

const YEARS = [2015, 2016, 2017, 2018, 2023, 2024];

const App = () => {
  const [withCommute, setwithCommute] = useState<boolean>(true);
  const [withPrivate, setwithPrivate] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [activeSort, setActiveSort] = useState<SortType>(DEFAULT_SORT);
  const [gearId, setGearId] = useState<string | undefined>();
  const [year, setYear] = useState<number | undefined>(new Date().getUTCFullYear());

  const activities = useActivities({search, withCommute, sort: activeSort, withPrivate, gearId, year});

  const handleCommuteChange = ({target}: ChangeEvent<HTMLInputElement>) => setwithCommute(target.checked);
  const handlePrivateChange = ({target}: ChangeEvent<HTMLInputElement>) => setwithPrivate(target.checked);
  const handleSearchChange = ({target}: ChangeEvent<HTMLInputElement>) => setSearch(target.value);
  const handleSortChange = (sortType: SortType) => () => setActiveSort(sortType);

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
        <VStack align="stretch" flex={0.75}>
          <Stats />
          <ProgressChart />
          <DistanceChart />
        </VStack>
        <VStack align="stretch" flex={1}>
          <InputGroup>
            <Input placeholder="Search" autoFocus={true} value={search} onChange={handleSearchChange} />
            <InputRightElement marginRight={2}>
              <Tag>{activities.length}</Tag>
            </InputRightElement>
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
              {GEARS.map(({value, label}) => (
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
            <Checkbox isChecked={withCommute} onChange={handleCommuteChange}>
              Commute?
            </Checkbox>
            <Checkbox isChecked={withPrivate} onChange={handlePrivateChange}>
              Private?
            </Checkbox>
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
