import {ChangeEvent} from 'react';
import {Input} from '@chakra-ui/react';
import {ChainEvent} from '../../models';
import {EventFormProps} from '../../components';

const ChainEventForm = ({event, onChange}: EventFormProps<ChainEvent>) => {
  const handlePropertyChange =
    (property: keyof ChainEvent) =>
    ({target}: ChangeEvent<HTMLInputElement>) => {
      onChange({...event, [property]: target.value});
    };

  return (
    <>
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
