import {PunctureEvent} from '../../models';
import {GearSelect, EventFormProps} from '../../components';

const PunctureEventForm = ({event, onChange}: EventFormProps<PunctureEvent>) => {
  return (
    <>
      <GearSelect
        size="sm"
        selectedGear={event.bike ? [event.bike] : []}
        excludedGearTypes={['shoes']}
        onSelectedGearChange={bikes => onChange({...event, bike: bikes[0]})}
        selectContentProps={{portalled: false}}
      />
    </>
  );
};

export {PunctureEventForm};
