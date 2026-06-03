import {useRef} from 'react';
import {
  Badge,
  Skeleton,
  Table,
  Tag,
  VStack,
} from '@chakra-ui/react';
import {useVirtualizer} from '@tanstack/react-virtual';
import {HiArrowDown, HiArrowUp} from 'react-icons/hi2';
import {Tooltip} from './ui';
import {ActivityListItem} from './ActivityListItem';
import {SortType, SortDirection, TAGS, GetFtp} from '../models';
import {Activity, DetailedActivity} from '../models/strava';
import {GetLabel} from '../models/label';

const ROW_HEIGHT = 36;

type ActivityTableProps = {
  activities: Activity[] | null;
  unprocessedActivities: Activity[];
  activityMeta: Record<string, DetailedActivity>;
  displayedSorts: SortType[];
  activeSort: SortType;
  sortDirection: SortDirection;
  getFtp: GetFtp;
  label: GetLabel;
  usedEmojis: Set<string>;
  onSortChange: (sortType: SortType) => () => void;
  onSortDirectionToggle: () => void;
  onDeleteActivity: (id: number) => void;
};

const ActivityTable = ({
  activities,
  unprocessedActivities,
  activityMeta,
  displayedSorts,
  activeSort,
  sortDirection,
  getFtp,
  label,
  usedEmojis,
  onSortChange,
  onSortDirectionToggle,
  onDeleteActivity,
}: ActivityTableProps) => {
  const isLoading = null === activities;
  const tableRef = useRef<HTMLTableElement>(null);

  const rowCount = activities?.length ?? 0;

  // @tanstack/react-virtual's useVirtualizer returns functions the React Compiler can't track; this is a
  // library API shape, not an anti-pattern in our code.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => tableRef.current?.closest('[data-scroll-root]') as HTMLElement | null,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0 ? virtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end : 0;

  return (
    <Table.Root unstyled={true} ref={tableRef}>
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
            {paddingTop > 0 && (
              <Table.Row>
                <Table.Cell style={{height: paddingTop, padding: 0}} />
              </Table.Row>
            )}
            {virtualItems.map(virtualRow => {
              const activity = activities[virtualRow.index];
              return (
                <ActivityListItem
                  key={activity.id}
                  getFtp={getFtp}
                  activity={activity}
                  fullActivity={activityMeta[activity.id] ?? null}
                  enabledSorts={displayedSorts}
                />
              );
            })}
            {paddingBottom > 0 && (
              <Table.Row>
                <Table.Cell style={{height: paddingBottom, padding: 0}} />
              </Table.Row>
            )}
          </>
        )}
      </Table.Body>
    </Table.Root>
  );
};

export {ActivityTable};
