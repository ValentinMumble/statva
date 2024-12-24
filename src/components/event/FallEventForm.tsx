import {ChangeEvent} from 'react';
import {Input} from '@chakra-ui/react';
import {FallEvent} from '../../models';
import {EventFormProps} from '../../components';

const FallEventForm = ({event, onChange}: EventFormProps<FallEvent>) => {
  const handlePropertyChange =
    (property: keyof FallEvent) =>
    ({target}: ChangeEvent<HTMLInputElement>) => {
      onChange({...event, [property]: target.value});
    };

  return (
    <>
      <Input
        size="sm"
        width="200px"
        placeholder="Description"
        value={event.description ?? ''}
        onChange={handlePropertyChange('description')}
      />
    </>
  );
};

export {FallEventForm};
