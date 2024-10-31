import {createListCollection, SelectValueChangeDetails, SelectRootProps} from '@chakra-ui/react';
import {
  SelectContent,
  SelectItem,
  SelectRoot,
  SelectTrigger,
  SelectValueText,
  SelectContentProps,
} from '../components/ui';
import {getGearEmoji} from '../models';
import {DetailedAthlete} from '../models/strava';

type GearSelectProps = {
  athlete: DetailedAthlete | null;
  selectedGear: string[];
  onSelectedGearChange: (selectedGear: string[]) => void;
  clearable?: boolean;
  selectContentProps?: SelectContentProps;
  selectRootProps?: Partial<SelectRootProps>;
};

const GearSelect = ({
  athlete,
  selectedGear,
  onSelectedGearChange,
  selectContentProps,
  selectRootProps,
  clearable = false,
}: GearSelectProps) => {
  const handleGearChange = ({value}: SelectValueChangeDetails) => onSelectedGearChange(value);

  const gearCollection = createListCollection({
    items: [...(athlete?.bikes ?? []), ...(athlete?.shoes ?? [])].map(({id}) => ({
      value: id,
      label: getGearEmoji(athlete, id),
    })),
  });
  gearCollection.items.push({value: 'null', label: '🤷'});

  return (
    <SelectRoot
      width="90px"
      collection={gearCollection}
      value={selectedGear}
      onValueChange={handleGearChange}
      {...selectRootProps}
    >
      <SelectTrigger clearable={clearable}>
        <SelectValueText placeholder="⚙️" />
      </SelectTrigger>
      <SelectContent {...selectContentProps}>
        {gearCollection.items.map(gear => (
          <SelectItem item={gear} key={gear.value}>
            {gear.label}
          </SelectItem>
        ))}
      </SelectContent>
    </SelectRoot>
  );
};

export {GearSelect};
