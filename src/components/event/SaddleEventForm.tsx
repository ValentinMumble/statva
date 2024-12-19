import {ChangeEvent} from 'react';
import {Input} from '@chakra-ui/react';
import {SaddleEvent, isSaddleEvent} from '../../models';
import {EventFormProps} from '../../components';

const SaddleEventForm = ({event, onChange}: EventFormProps) => {
  if (!isSaddleEvent(event)) {
    return null;
  }

  const handlePropertyChange =
    (property: keyof SaddleEvent) =>
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

export {SaddleEventForm};
