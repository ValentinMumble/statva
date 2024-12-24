import {SelectValueChangeDetails, SelectRootProps} from '@chakra-ui/react';
import {
  SelectContent,
  SelectItem,
  SelectRoot,
  SelectTrigger,
  SelectValueText,
  SelectContentProps,
} from '../components/ui';
import {GEAR, labelCollection, Gear} from '../models';
import {useLabels} from '../hooks';

type GearSelectProps = Omit<SelectRootProps, 'collection'> & {
  selectedGear: string[];
  onSelectedGearChange: (selectedGear: string[]) => void;
  clearable?: boolean;
  selectContentProps?: SelectContentProps;
  excludedGearTypes?: Gear['type'][];
};

const GearSelect = ({
  selectedGear,
  onSelectedGearChange,
  selectContentProps,
  clearable,
  excludedGearTypes = [],
  ...rest
}: GearSelectProps) => {
  const [label] = useLabels();

  const handleGearChange = ({value}: SelectValueChangeDetails) => onSelectedGearChange(value);

  const relevantGearIds = Object.values(GEAR)
    .filter(({type}) => !excludedGearTypes.includes(type))
    .map(({id}) => id);

  const gearCollection = labelCollection(relevantGearIds, label);
  gearCollection.items.push({value: 'null', label: '🤷'});

  return (
    <SelectRoot
      width="180px"
      value={selectedGear}
      onValueChange={handleGearChange}
      collection={gearCollection}
      {...rest}
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
