import {ChangeEvent} from 'react';
import {Input} from '@chakra-ui/react';
import {CassetteEvent} from '../../models';
import {EventFormProps} from '../../components';

const CassetteEventForm = ({event, onChange}: EventFormProps<CassetteEvent>) => {
  const handlePropertyChange =
    (property: keyof CassetteEvent) =>
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
        placeholder="Range"
        value={event.range ?? ''}
        onChange={handlePropertyChange('range')}
      />
    </>
  );
};

export {CassetteEventForm};
