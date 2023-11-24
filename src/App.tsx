import {ChangeEvent, ReactNode, useState} from 'react';
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
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
} from '@chakra-ui/react';
import {SortType, SORT_TYPES, GEARS, YEARS, SortDirection, formatDuration, formatDistance} from './models';
import {
  ActivityListItem,
  MonthChart,
  GearChart,
  ProgressChart,
  Stats,
  AverageGearChart,
  HeartChart,
} from './components';
import {useActivities} from './hooks';

const DEFAULT_SORT: SortType = 'date';

const accordionItems: {label: string; component: ReactNode}[] = [
  {label: 'N-Peloton average speed 💯', component: <ProgressChart search="N-Peloton" />},
  {
    label: 'Distance / month 🗺️',
    component: <MonthChart data="distance" filter={{years: [2023, 2024]}} formatter={value => formatDistance(value)} />,
  },
  {
    label: 'Elevation / month ⛰️',
    component: (
      <MonthChart
        data="total_elevation_gain"
        filter={{years: [2023, 2024]}}
        formatter={value => formatDistance(value)}
      />
    ),
  },
  {label: 'Distance / bike 🚲', component: <GearChart data="distance" formatter={value => formatDistance(value)} />},
  {label: 'Time / bike ⏱️', component: <GearChart data="moving_time" formatter={value => formatDuration(value)} />},
  {label: 'Average speed / bike 💯', component: <AverageGearChart />},
  {label: 'Average heart rate 🫀', component: <HeartChart />},
];

const App = () => {
  const [withPrivate, setWithPrivate] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [activeSort, setActiveSort] = useState<SortType>(DEFAULT_SORT);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [gearId, setGearId] = useState<string | undefined>();
  const [years, setYears] = useState<number[]>([new Date().getUTCFullYear()]);

  const activities = useActivities({search, sort: activeSort, withPrivate, gearId, years, sortDirection});

  const handlePrivateToggle = () => setWithPrivate(!withPrivate);
  const handleSearchChange = ({target}: ChangeEvent<HTMLInputElement>) => setSearch(target.value);
  const handleSearchClear = () => setSearch('');
  const handleSortChange = (sortType: SortType) => () => setActiveSort(sortType);
  const handleSortDirectionToggle = () => setSortDirection('asc' === sortDirection ? 'desc' : 'asc');

  const handleYearChange = ({target}: ChangeEvent<HTMLSelectElement>) =>
    setYears('' === target.value ? [] : [Number(target.value)]);
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
        <VStack align="stretch" flexBasis="35%" gap={10}>
          <Stats />
          <Accordion defaultIndex={[0]} allowMultiple={true}>
            {accordionItems.map(item => (
              <AccordionItem key={item.label}>
                <h2>
                  <AccordionButton>
                    <Box as="b" flex="1" fontSize="1.1em" textAlign="left">
                      {item.label}
                    </Box>
                    <AccordionIcon />
                  </AccordionButton>
                </h2>
                <AccordionPanel>{item.component}</AccordionPanel>
              </AccordionItem>
            ))}
          </Accordion>
        </VStack>
        <VStack align="stretch" flexBasis="65%">
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
          <Stack direction={['row']} justifyContent="space-between">
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
