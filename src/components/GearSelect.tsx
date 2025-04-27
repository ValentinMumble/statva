import {SelectValueChangeDetails, SelectRootProps, Select, Portal} from '@chakra-ui/react';
import {GEAR, labelCollection, Gear} from '../models';
import {useLabels} from '../hooks';

type GearSelectProps = Omit<SelectRootProps, 'collection'> & {
  selectedGear: string[];
  onSelectedGearChange: (selectedGear: string[]) => void;
  clearable?: boolean;
  excludedGearTypes?: Gear['type'][];
  portalled?: boolean;
};

const GearSelect = ({
  selectedGear,
  onSelectedGearChange,
  portalled = true,
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
    <Select.Root
      width={['80px', '180px']}
      value={selectedGear}
      onValueChange={handleGearChange}
      collection={gearCollection}
      {...rest}
    >
      <Select.Control>
        <Select.Trigger>
          <Select.ValueText placeholder="⚙️" />
        </Select.Trigger>
        <Select.IndicatorGroup>
          {clearable && <Select.ClearTrigger />}
          <Select.Indicator />
        </Select.IndicatorGroup>
      </Select.Control>
      <Portal disabled={!portalled}>
        <Select.Positioner>
          <Select.Content>
            {gearCollection.items.map(gear => (
              <Select.Item item={gear} key={gear.value}>
                {gear.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
      </Portal>
    </Select.Root>
  );
};

export {GearSelect};
