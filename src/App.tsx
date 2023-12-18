import {ChangeEvent, ReactNode, useState} from 'react';
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
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
import {SortType, SORT_TYPES, GEARS, SortDirection, formatDuration, formatDistance} from './models';
import {
  ActivityListItem,
  AverageGearChart,
  EddingtonChart,
  GearChart,
  HeartChart,
  MonthChart,
  ProgressChart,
  Stats,
} from './components';
import {useActivities} from './hooks';

const accordionItems: {label: string; component: ReactNode}[] = [
  {label: 'N-Peloton 🏁 & ⚡️', component: <ProgressChart search="N-Peloton" />},
  {
    label: 'Distance / time 🗺️',
    component: (
      <MonthChart timeframe="week" data="distance" dataLabel="🗺️" formatter={value => formatDistance(value, 0)} />
    ),
  },
  {
    label: 'D+ / time ⛰️',
    component: (
      <MonthChart data="total_elevation_gain" dataLabel="⛰️" formatter={value => formatDistance(value)} type="area" />
    ),
  },
  {label: 'Eddington / month 🧸', component: <EddingtonChart startYear={2023} />},
  {
    label: 'Distance / bike 🚲',
    component: <GearChart dataLabel="🗺️" data="distance" formatter={value => formatDistance(value, 0)} type="pie" />,
  },
  {
    label: 'Time / bike ⏱️',
    component: <GearChart data="moving_time" dataLabel="⏱️" formatter={formatDuration} type="pie" />,
  },
  {label: 'Average speed / bike 🏁', component: <AverageGearChart />},
  {label: 'Average heart rate 🫀', component: <HeartChart />},
];

const App = () => {
  const [withPrivate, setWithPrivate] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [activeSort, setActiveSort] = useState<SortType>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [gearId, setGearId] = useState<string | undefined>();
  const [years, setYears] = useState<number[]>([new Date().getUTCFullYear()]);

  const [activities, isLoading] = useActivities({search, sort: activeSort, withPrivate, gearId, years, sortDirection});

  const handleSortDirectionToggle = () => setSortDirection('asc' === sortDirection ? 'desc' : 'asc');
  const handlePrivateToggle = () => setWithPrivate(!withPrivate);
  const handleSearchChange = ({target}: ChangeEvent<HTMLInputElement>) => setSearch(target.value);
  const handleSearchClear = () => setSearch('');
  const handleSortChange = (sortType: SortType) => () =>
    sortType === activeSort ? handleSortDirectionToggle() : setActiveSort(sortType);

  const handleYearChange = ({target}: ChangeEvent<HTMLSelectElement>) =>
    setYears('' === target.value ? [] : [Number(target.value)]);
  const handleGearChange = ({target}: ChangeEvent<HTMLSelectElement>) =>
    setGearId('' === target.value ? undefined : target.value);

  return (
    <Box padding={7}>
      <HStack alignItems="baseline" gap={5} flexDirection={{base: 'column', md: 'row'}}>
        <VStack align="stretch" flexBasis="38%" gap={7}>
          <Stats />
          <Accordion defaultIndex={[0]} allowMultiple={true}>
            {accordionItems.map(item => (
              <AccordionItem key={item.label}>
                <h2>
                  <AccordionButton>
                    <Box as="b" flex="1" textAlign="left">
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
          <Stack direction={['row']} justifyContent="space-between">
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
              {Object.values(GEARS).map(({value, label}) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Select placeholder="🗓️" width={24} value={years[0]} onChange={handleYearChange}>
              {[2024, 2023, 2018, 2017, 2016, 2015].map(year => (
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
      </HStack>
    </Box>
  );
};

export {App};
