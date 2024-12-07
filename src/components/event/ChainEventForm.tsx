import {ChangeEvent} from 'react';
import {Input} from '@chakra-ui/react';
import {ChainEvent, isChainEvent} from '../../models';
import {EventFormProps} from './event-form';
import {GearSelect} from '../GearSelect';

const ChainEventForm = ({event, onChange}: EventFormProps) => {
  if (!isChainEvent(event)) {
    return null;
  }

  const handlePropertyChange =
    (property: keyof ChainEvent) =>
    ({target}: ChangeEvent<HTMLInputElement>) => {
      onChange({...event, [property]: target.value});
    };

  return (
    <>
      <GearSelect
        size="sm"
        selectedGear={[event.bike]}
        onSelectedGearChange={bikes => onChange({...event, bike: bikes[0]})}
        selectContentProps={{portalled: false}}
      />
      <Input
        size="sm"
        width="200px"
        placeholder="🔗"
        value={event.chain ?? ''}
        onChange={handlePropertyChange('chain')}
      />
    </>
  );
};

export {ChainEventForm};
