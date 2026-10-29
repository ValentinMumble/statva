import {Field, NativeSelect} from '@chakra-ui/react';
import {useGear, useLabels} from '../../hooks';
import {isPedalled} from '../../models';

type GearFieldProps = {sport: string; value: string; onChange: (gearId: string) => void};

/** Picks a bike for a ride or shoes for a run, or none (an empty value). Nothing for other sports. */
const GearField = ({sport, value, onChange}: GearFieldProps) => {
  const {label} = useLabels();
  const gear = useGear();
  const gearType = isPedalled(sport) ? 'bike' : /Run|Walk|Hike/.test(sport) ? 'shoes' : null;
  if (null === gearType) return null;

  const options = gear.filter(item => item.type === gearType && (!item.retired || item.id === value));

  return (
    <Field.Root>
      <Field.Label>{'bike' === gearType ? 'Bike' : 'Shoes'}</Field.Label>
      <NativeSelect.Root>
        <NativeSelect.Field value={value} onChange={({target}) => onChange(target.value)}>
          <option value="">{'bike' === gearType ? 'No bike' : 'No shoes'}</option>
          {options.map(item => (
            <option key={item.id} value={item.id}>
              {label(item.id) === item.id ? item.name : label(item.id)}
            </option>
          ))}
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>
    </Field.Root>
  );
};

export {GearField};
