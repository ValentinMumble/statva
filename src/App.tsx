import {ChangeEvent, useState} from 'react';
import {
  Checkbox,
  Input,
  ListItem,
  Heading,
  Spinner,
  Stack,
  VStack,
  Box,
  Tag,
  HStack,
  TagLeftIcon,
  TagLabel,
  Center,
  ListIcon,
  List,
  Spacer,
  Button,
} from '@chakra-ui/react';
import {GiPathDistance} from 'react-icons/gi';
import {MdOutlineShowChart, MdOutlineSpeed, MdOutlineTimer} from 'react-icons/md';
import {useActivities} from './hooks';
import {
  SortType,
  formatDistance,
  formatDuration,
  formatElevation,
  formatSpeed,
  getActivityTypeIcon,
  sortTypes,
} from './models';

const ACTIVITY_URL = 'https://www.strava.com/activities/';

const App = () => {
  const [showCommute, setShowCommute] = useState<boolean>(false);
  const [showPrivate, setShowPrivate] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [sort, setSort] = useState<SortType>('date');
  const activities = useActivities({search, showCommute, sort, showPrivate});

  const handleCommuteChange = (event: ChangeEvent<HTMLInputElement>) => setShowCommute(event.target.checked);
  const handlePrivateChange = (event: ChangeEvent<HTMLInputElement>) => setShowPrivate(event.target.checked);
  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value);
  const handleSortChange = (sortType: SortType) => () => setSort(sortType);

  if (null === activities) {
    return (
      <Center height="full" flexDirection="column" gap="10">
        <Heading as="h1" size="lg">
          Fetching activities
        </Heading>
        <Spinner color="orange.500" />
      </Center>
    );
  }

  console.log(activities);

  return (
    <Box padding={4} margin="0 auto" width="4xl">
      <VStack spacing={4} align="stretch">
        <Heading as="h3" size="lg">
          {activities.length} activities
        </Heading>
        <Input autoFocus={true} value={search} onChange={handleSearchChange} />
        <Stack direction={['row']} alignSelf="center">
          {Object.values(sortTypes).map(sortType => (
            <Button
              variant="ghost"
              isActive={sort === sortType.value}
              onClick={handleSortChange(sortType.value as SortType)}
            >
              {sortType.label}
            </Button>
          ))}
        </Stack>
        <Stack direction={['column']}>
          <Checkbox checked={showCommute} onChange={handleCommuteChange}>
            Show commute
          </Checkbox>
          <Checkbox checked={showPrivate} onChange={handlePrivateChange}>
            Show private
          </Checkbox>
        </Stack>
        <List shadow="md" padding={4}>
          {activities.map(activity => (
            <ListItem key={activity.id} height={8}>
              <HStack spacing={2}>
                <ListIcon as={getActivityTypeIcon(activity.sport_type)} />
                <a target="_blank" href={`${ACTIVITY_URL}${activity.id}`}>
                  {activity.name}
                </a>
                <Spacer />
                <Tag>
                  <TagLeftIcon as={GiPathDistance}></TagLeftIcon>
                  <TagLabel>{formatDistance(activity.distance)}</TagLabel>
                </Tag>
                <Tag>
                  <TagLeftIcon as={MdOutlineShowChart}></TagLeftIcon>
                  <TagLabel>{formatElevation(activity.total_elevation_gain)}</TagLabel>
                </Tag>
                <Tag>
                  <TagLeftIcon as={MdOutlineTimer}></TagLeftIcon>
                  <TagLabel>{formatDuration(activity.moving_time)}</TagLabel>
                </Tag>
                <Tag>
                  <TagLeftIcon as={MdOutlineSpeed}></TagLeftIcon>
                  <TagLabel>{formatSpeed(activity.average_speed)}</TagLabel>
                </Tag>
              </HStack>
            </ListItem>
          ))}
        </List>
      </VStack>
    </Box>
  );
};

export {App};
