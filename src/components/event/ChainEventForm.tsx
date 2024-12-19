import {ChangeEvent} from 'react';
import {Input} from '@chakra-ui/react';
import {ChainEvent} from '../../models';
import {GearSelect, EventFormProps} from '../../components';

const ChainEventForm = ({event, onChange}: EventFormProps<ChainEvent>) => {
  const handlePropertyChange =
    (property: keyof ChainEvent) =>
    ({target}: ChangeEvent<HTMLInputElement>) => {
      onChange({...event, [property]: target.value});
    };

  return (
    <>
      <GearSelect
        size="sm"
        selectedGear={event.bike ? [event.bike] : []}
        excludedGearTypes={['shoes']}
        onSelectedGearChange={bikes => onChange({...event, bike: bikes[0]})}
        selectContentProps={{portalled: false}}
      />
      <Input
        size="sm"
        width="200px"
        placeholder="Chain"
        value={event.chain ?? ''}
        onChange={handlePropertyChange('chain')}
      />
    </>
  );
};

export {ChainEventForm};
