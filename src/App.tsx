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
} from '@chakra-ui/react';
import {SortType, SORT_TYPES} from './models';
import {ActivityListItem, ProgressChart, Stats} from './components';
import {useActivities} from './hooks';

const DEFAULT_SORT: SortType = 'date';

const App = () => {
  const [withCommute, setwithCommute] = useState<boolean>(true);
  const [withPrivate, setwithPrivate] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [activeSort, setActiveSort] = useState<SortType>(DEFAULT_SORT);

  const activities = useActivities({search, withCommute, sort: activeSort, withPrivate});

  const handleCommuteChange = (event: ChangeEvent<HTMLInputElement>) => setwithCommute(event.target.checked);
  const handlePrivateChange = (event: ChangeEvent<HTMLInputElement>) => setwithPrivate(event.target.checked);
  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value);
  const handleSortChange = (sortType: SortType) => () => setActiveSort(sortType);

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
        <VStack align="stretch" flex={0.75} gap={10}>
          <Stats />
          <ProgressChart />
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
