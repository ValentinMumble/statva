import {FallEvent} from '../../models';
import {GearSelect, EventFormProps} from '../../components';

const FallEventForm = ({event, onChange}: EventFormProps<FallEvent>) => {
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

export {FallEventForm};
