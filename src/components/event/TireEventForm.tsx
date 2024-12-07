import {ChangeEvent} from 'react';
import {Input} from '@chakra-ui/react';
import {TireEvent, isTireEvent} from '../../models';
import {EventFormProps} from '../../components';

const TireEventForm = ({event, onChange}: EventFormProps) => {
  if (!isTireEvent(event)) {
    return null;
  }

  const handlePropertyChange =
    (property: keyof TireEvent) =>
    ({target}: ChangeEvent<HTMLInputElement>) => {
      onChange({...event, [property]: target.value});
    };

  return (
    <>
      <Input
        size="sm"
        width="200px"
        placeholder="Brand"
        value={event.brand ?? ''}
        onChange={handlePropertyChange('brand')}
      />
      <Input
        size="sm"
        width="200px"
        placeholder="Model"
        value={event.model ?? ''}
        onChange={handlePropertyChange('model')}
      />
      <Input
        size="sm"
        width="200px"
        placeholder="Width"
        value={event.width ?? ''}
        onChange={handlePropertyChange('width')}
      />
    </>
  );
};

export {TireEventForm};
