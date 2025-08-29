import {ChangeEvent, useState} from 'react';
import {
  Badge,
  Button,
  Group,
  HoverCard,
  HStack,
  IconButton,
  Input,
  InputGroup,
  Portal,
  Skeleton,
  Stack,
  Table,
  Tag,
  VStack,
} from '@chakra-ui/react';
import {useLocalStorage} from 'usehooks-ts';
import {BsDatabaseDown} from 'react-icons/bs';
import {HiArrowDown, HiArrowUp, HiOutlineLockClosed} from 'react-icons/hi2';
import {MdClear, MdFilterList} from 'react-icons/md';
import {PiBicycle} from 'react-icons/pi';
import {Tooltip, Switch} from '../components/ui';
import {ActivityListItem, ActivityTypeFilter, ChartAccordion, GearSelect, Stats, WeekView} from '../components';
import {SortType, SortDirection, TAGS, DEFAULT_SORTS, getTypes} from '../models';
import {ActivityType} from '../models/strava';
import {useActivities, useActivityMeta, useEnv, useFtp, useLabels} from '../hooks';

const DISPLAYED_ITEMS = 75;

const App = () => {
  const [withPrivate, setWithPrivate] = useState<boolean>(false);
  const [withCommute, setWithCommute] = useState<boolean | 'only'>(true);
  const [search, setSearch] = useState<string>('');
  const [activeSort, setActiveSort] = useState<SortType>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [gearIds, setGearIds] = useState<string[]>([]);
  const [displayedItems, setDisplayedItems] = useState<number>(DISPLAYED_ITEMS);

  const [displayedSorts, setDisplayedSorts] = useLocalStorage<SortType[]>('sort-types', DEFAULT_SORTS);
  const [types, setTypes] = useLocalStorage<ActivityType[] | null>('activity-types', getTypes(ActivityType.Ride));

  const [devMode, setDevMode] = useEnv();
  const [label] = useLabels();
  const [getFtp] = useFtp();
  const [activities, refetch, unprocessedActivities, deleteActivity] = useActivities({
    search,
    includedActivityTypes: types ?? undefined,
    sort: activeSort,
    withPrivate,
    withCommute,
    gearId: gearIds[0],
    sortDirection,
  });
  const [activityMeta] = useActivityMeta();

  const handleRefetch = () => refetch(1, false, 20);
  const handleSortDirectionToggle = () => setSortDirection('asc' === sortDirection ? 'desc' : 'asc');
  const handlePrivateToggle = () => setWithPrivate(!withPrivate);
  const handleSearchChange = ({target}: ChangeEvent<HTMLInputElement>) => setSearch(target.value);
  const handleResetFilters = () => {
    setWithPrivate(false);
    setWithCommute(true);
    setSearch('');
    setTypes(getTypes(ActivityType.Ride));
    setActiveSort('date');
    setSortDirection('desc');
    setGearIds([]);
    setDisplayedItems(DISPLAYED_ITEMS);
  };
  const handleSortChange = (sortType: SortType) => () =>
    sortType === activeSort ? handleSortDirectionToggle() : setActiveSort(sortType);
  const handleDisplayMoreItems = () => setDisplayedItems(displayedItems => displayedItems + DISPLAYED_ITEMS);

  const handleSortToggle = (sortType: SortType) => () =>
    setDisplayedSorts(displayedSorts =>
      displayedSorts.includes(sortType)
        ? displayedSorts.filter(sort => sort !== sortType)
        : [...displayedSorts, sortType]
    );

  const handleBikeOnlyToggle = () =>
    setTypes(types?.every(type => getTypes(ActivityType.Ride).includes(type)) ? null : getTypes(ActivityType.Ride));

  const isLoading = null === activities;

  return (
    <Stack padding={[undefined, '0 20px']} gap="20px" direction={['column-reverse', 'row']}>
      <VStack align="stretch" flexBasis="40%" gap="20px" width={['100vw', null]} height="100vh" overflowY="scroll">
        <Stats />
        <ChartAccordion />
        <WeekView />
      </VStack>
      <VStack align="stretch" flexBasis="60%" height="100vh" overflow="scroll">
        <Group width="full">
          {import.meta.env.DEV && (
            <Switch
              size="xs"
              title="Use local"
              checked={devMode}
              onCheckedChange={({checked}) => setDevMode(checked)}
            />
          )}
          <InputGroup
            flex={1}
            endElement={
              <>
                <IconButton title="Clear" variant="ghost" size="xs" onClick={handleResetFilters}>
                  <MdClear />
                </IconButton>
                {activities?.length ?? 0}
              </>
            }
          >
            <Input
              disabled={isLoading}
              placeholder={devMode ? 'DEV MODE ☞ USING LOCAL ACTIVITIES' : 'Search'}
              autoFocus={true}
              value={search}
              onChange={handleSearchChange}
            />
          </InputGroup>
          <GearSelect selectedGear={gearIds} onSelectedGearChange={setGearIds} clearable={true} />
          <IconButton title="With private" variant={withPrivate ? 'surface' : 'ghost'} onClick={handlePrivateToggle}>
            <HiOutlineLockClosed />
          </IconButton>
          <Group hideBelow="md">
            <IconButton
              title="Bike only"
              variant={types?.every(type => getTypes(ActivityType.Ride).includes(type)) ? 'surface' : 'ghost'}
              onClick={handleBikeOnlyToggle}
            >
              <PiBicycle />
            </IconButton>
            <IconButton variant="ghost" onClick={handleRefetch}>
              <BsDatabaseDown />
            </IconButton>
            <HoverCard.Root size="lg" openDelay={300}>
              <HoverCard.Trigger>
                <MdFilterList size="20px" />
              </HoverCard.Trigger>
              <Portal>
                <HoverCard.Positioner>
                  <HoverCard.Content maxWidth="unset" gap="10px" padding="10px">
                    <HoverCard.Arrow>
                      <HoverCard.ArrowTip />
                    </HoverCard.Arrow>
                    <HStack>
                      {TAGS.map(tag => (
                        <Tooltip key={tag.sortType} content={tag.help}>
                          <IconButton
                            size="xs"
                            variant={displayedSorts.includes(tag.sortType) ? 'surface' : 'ghost'}
                            onClick={handleSortToggle(tag.sortType)}
                          >
                            {label(tag.sortType)}
                          </IconButton>
                        </Tooltip>
                      ))}
                    </HStack>
                    <HStack>
                      <ActivityTypeFilter
                        types={types}
                        onTypesChange={setTypes}
                        withCommute={withCommute}
                        onWithCommuteChange={setWithCommute}
                      />
                    </HStack>
                  </HoverCard.Content>
                </HoverCard.Positioner>
              </Portal>
            </HoverCard.Root>
          </Group>
        </Group>
        <Table.Root unstyled={true}>
          <Table.Header hideBelow="md">
            <Table.Row fontSize=".8em" cursor="pointer">
              <Table.ColumnHeader />
              <Table.ColumnHeader>
                <VStack>
                  <span onClick={handleSortDirectionToggle}>
                    {'asc' === sortDirection ? <HiArrowUp /> : <HiArrowDown />}
                  </span>
                  <span onClick={handleSortChange('date')}>📅</span>
                </VStack>
              </Table.ColumnHeader>
              {TAGS.filter(({sortType}) => displayedSorts.includes(sortType)).map(tag => (
                <Table.ColumnHeader key={tag.sortType} onClick={handleSortChange(tag.sortType)}>
                  {isLoading ? (
                    <Skeleton margin="0 5px">i</Skeleton>
                  ) : (
                    <VStack>
                      <Tag.Root colorPalette={tag.sortType === activeSort ? 'orange' : 'gray'} variant="subtle">
                        <Tag.Label>{tag.total(activities, getFtp)}</Tag.Label>
                      </Tag.Root>
                      <Tooltip content={tag.help}>
                        <span>{label(tag.sortType)}</span>
                      </Tooltip>
                    </VStack>
                  )}
                </Table.ColumnHeader>
              ))}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {isLoading ? (
              [...new Array(20)].map((_, index) => (
                <ActivityListItem key={index} getFtp={getFtp} activity={null} enabledSorts={displayedSorts} />
              ))
            ) : 0 === activities.length ? (
              <Table.Row>
                <Table.Cell>No activities... 🏜️</Table.Cell>
              </Table.Row>
            ) : (
              <>
                {unprocessedActivities.length > 0 && (
                  <>
                    <Table.Row>
                      <Table.Cell />
                      <Table.Cell>
                        <Badge>Unprocessed</Badge>
                      </Table.Cell>
                    </Table.Row>
                    {unprocessedActivities.map(activity => (
                      <ActivityListItem
                        key={activity.id}
                        getFtp={getFtp}
                        activity={activity}
                        fullActivity={activityMeta[activity.id] ?? null}
                        enabledSorts={displayedSorts}
                        showDeleteButton={true}
                        onDeleteActivity={deleteActivity}
                      />
                    ))}
                    <Table.Row>
                      <Table.Cell />
                      <Table.Cell>&nbsp;</Table.Cell>
                    </Table.Row>
                  </>
                )}
                {activities.slice(0, displayedItems).map(activity => (
                  <ActivityListItem
                    key={activity.id}
                    getFtp={getFtp}
                    activity={activity}
                    fullActivity={activityMeta[activity.id] ?? null}
                    enabledSorts={displayedSorts}
                  />
                ))}
              </>
            )}
            {(activities?.length ?? 0) > displayedItems && (
              <Table.Row>
                <Table.Cell />
                <Table.Cell textAlign="center" padding="10px">
                  <Button variant="outline" onClick={handleDisplayMoreItems}>
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
