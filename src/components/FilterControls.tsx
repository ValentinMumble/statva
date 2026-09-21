import {ChangeEvent, KeyboardEvent} from 'react';
import {
  Group,
  HoverCard,
  HStack,
  IconButton,
  Input,
  InputGroup,
  Portal,
} from '@chakra-ui/react';
import {Link} from 'react-router';
import {BsDatabaseDown} from 'react-icons/bs';
import {HiOutlineLockClosed} from 'react-icons/hi2';
import {MdClear, MdFilterList, MdInsights} from 'react-icons/md';
import {PiBicycle} from 'react-icons/pi';
import {Tooltip} from './ui';
import {ActivityTypeFilter} from './ActivityTypeFilter';
import {GearSelect} from './GearSelect';
import {SortType, TAGS, getTypes} from '../models';
import {ActivityType} from '../models/strava';
import {GetLabel} from '../models/label';

type FilterControlsProps = {
  search: string;
  isLoading: boolean;
  activityCount: number;
  withPrivate: boolean;
  withCommute: boolean | 'only';
  types: ActivityType[] | null;
  gearIds: string[];
  displayedSorts: SortType[];
  label: GetLabel;
  onSearchChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSearchKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onResetFilters: () => void;
  onPrivateToggle: () => void;
  onBikeOnlyToggle: () => void;
  onRefetch: () => void;
  onGearChange: (gearIds: string[]) => void;
  onTypesChange: (types: ActivityType[] | null) => void;
  onWithCommuteChange: (value: boolean | 'only') => void;
  onSortToggle: (sortType: SortType) => () => void;
};

const FilterControls = ({
  search,
  isLoading,
  activityCount,
  withPrivate,
  withCommute,
  types,
  gearIds,
  displayedSorts,
  label,
  onSearchChange,
  onSearchKeyDown,
  onResetFilters,
  onPrivateToggle,
  onBikeOnlyToggle,
  onRefetch,
  onGearChange,
  onTypesChange,
  onWithCommuteChange,
  onSortToggle,
}: FilterControlsProps) => (
  <Group width="full">
    <InputGroup
      flex={1}
      endElement={
        <>
          <IconButton title="Clear" variant="ghost" size="xs" onClick={onResetFilters}>
            <MdClear />
          </IconButton>
          {activityCount}
        </>
      }
    >
      <Input
        disabled={isLoading}
        placeholder="Search"
        autoFocus={true}
        value={search}
        onChange={onSearchChange}
        onKeyDown={onSearchKeyDown}
      />
    </InputGroup>
    <GearSelect selectedGear={gearIds} onSelectedGearChange={onGearChange} clearable={true} />
    <IconButton title="With private" variant={withPrivate ? 'surface' : 'ghost'} onClick={onPrivateToggle}>
      <HiOutlineLockClosed />
    </IconButton>
    <IconButton asChild={true} title="Dashboard" variant="ghost">
      <Link to="/dashboard">
        <MdInsights />
      </Link>
    </IconButton>
    <Group hideBelow="md">
      <IconButton
        title="Bike only"
        variant={types?.every(type => getTypes(ActivityType.Ride).includes(type)) ? 'surface' : 'ghost'}
        onClick={onBikeOnlyToggle}
      >
        <PiBicycle />
      </IconButton>
      <IconButton variant="ghost" onClick={onRefetch}>
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
                      onClick={onSortToggle(tag.sortType)}
                    >
                      {label(tag.sortType)}
                    </IconButton>
                  </Tooltip>
                ))}
              </HStack>
              <HStack>
                <ActivityTypeFilter
                  types={types}
                  onTypesChange={onTypesChange}
                  withCommute={withCommute}
                  onWithCommuteChange={onWithCommuteChange}
                />
              </HStack>
            </HoverCard.Content>
          </HoverCard.Positioner>
        </Portal>
      </HoverCard.Root>
    </Group>
  </Group>
);

export {FilterControls};
