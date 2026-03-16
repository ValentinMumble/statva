import {
  Badge,
  Button,
  Skeleton,
  Table,
  Tag,
  VStack,
} from '@chakra-ui/react';
import {HiArrowDown, HiArrowUp} from 'react-icons/hi2';
import {Tooltip} from './ui';
import {ActivityListItem} from './ActivityListItem';
import {SortType, SortDirection, TAGS, GetFtp} from '../models';
import {Activity, DetailedActivity} from '../models/strava';
import {GetLabel} from '../models/label';

type ActivityTableProps = {
  activities: Activity[] | null;
  unprocessedActivities: Activity[];
  activityMeta: Record<string, DetailedActivity>;
  displayedSorts: SortType[];
  displayedItems: number;
  activeSort: SortType;
  sortDirection: SortDirection;
  getFtp: GetFtp;
  label: GetLabel;
  usedEmojis: Set<string>;
  onSortChange: (sortType: SortType) => () => void;
  onSortDirectionToggle: () => void;
  onDisplayMoreItems: () => void;
  onDeleteActivity: (id: number) => void;
};

const ActivityTable = ({
  activities,
  unprocessedActivities,
  activityMeta,
  displayedSorts,
  displayedItems,
  activeSort,
  sortDirection,
  getFtp,
  label,
  usedEmojis,
  onSortChange,
  onSortDirectionToggle,
  onDisplayMoreItems,
  onDeleteActivity,
}: ActivityTableProps) => {
  const isLoading = null === activities;

  return (
    <Table.Root unstyled={true}>
      <Table.Header hideBelow="md">
        <Table.Row fontSize=".8em" cursor="pointer">
          <Table.ColumnHeader />
          <Table.ColumnHeader width="36px" />
          <Table.ColumnHeader>
            <VStack>
              <span onClick={onSortDirectionToggle}>
                {'asc' === sortDirection ? <HiArrowUp /> : <HiArrowDown />}
              </span>
              <span onClick={onSortChange('date')}>📅</span>
            </VStack>
          </Table.ColumnHeader>
          {TAGS.filter(({sortType}) => displayedSorts.includes(sortType)).map(tag => (
            <Table.ColumnHeader key={tag.sortType} onClick={onSortChange(tag.sortType)}>
              {isLoading ? (
                <Skeleton margin="0 5px">i</Skeleton>
              ) : (
                <VStack>
                  <Tag.Root colorPalette={tag.sortType === activeSort ? 'orange' : 'gray'} variant="subtle">
                    <Tag.Label>{tag.total(activities, activityMeta, getFtp)}</Tag.Label>
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
                    usedEmojis={usedEmojis}
                    onDeleteActivity={onDeleteActivity}
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
        {(activities?.length ?? 0) >= displayedItems && (
          <Table.Row>
            <Table.Cell colSpan={3 + displayedSorts.length} textAlign="center" padding="10px">
              <Button variant="outline" onClick={onDisplayMoreItems}>
                More
              </Button>
            </Table.Cell>
          </Table.Row>
        )}
      </Table.Body>
    </Table.Root>
  );
};

export {ActivityTable};
