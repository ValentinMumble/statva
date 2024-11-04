import {SelectValueChangeDetails, SelectRootProps} from '@chakra-ui/react';
import {
  SelectContent,
  SelectItem,
  SelectRoot,
  SelectTrigger,
  SelectValueText,
  SelectContentProps,
} from '../components/ui';
import {GEAR, labelCollection} from '../models';
import {useLabels} from '../hooks';

type GearSelectProps = {
  selectedGear: string[];
  onSelectedGearChange: (selectedGear: string[]) => void;
  clearable?: boolean;
  selectContentProps?: SelectContentProps;
  selectRootProps?: Partial<SelectRootProps>;
};

const GearSelect = ({
  selectedGear,
  onSelectedGearChange,
  selectContentProps,
  selectRootProps,
  clearable = false,
}: GearSelectProps) => {
  const [label] = useLabels();

  const handleGearChange = ({value}: SelectValueChangeDetails) => onSelectedGearChange(value);

  const gearCollection = labelCollection(Object.keys(GEAR), label);
  gearCollection.items.push({value: 'null', label: '🤷'});

  return (
    <SelectRoot
      width="150px"
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
