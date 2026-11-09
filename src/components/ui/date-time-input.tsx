import {MouseEvent} from 'react';
import {chakra, Input, InputProps, useRecipe} from '@chakra-ui/react';

/**
 * A browser's own date and time boxes show the device's format (month first, AM and PM on a
 * US Mac), whatever the page's language. These show a fixed one, day/month/year and a 24-hour
 * clock, in a box styled like any other, with the browser's own box laid over it, unseen: a
 * click or a tap still opens the native calendar or wheel, and typing still works.
 */

type PickerInputProps = Omit<InputProps, 'type' | 'value'> & {value: string};

// "2026-11-09" as "09/11/2026".
const shownDate = (value: string): string => {
  const [year, month, day] = value.split('-');
  return undefined === day ? '' : `${day}/${month}/${year}`;
};

// A click on the box itself, not only on the browser's calendar icon, opens its picker.
const openPicker = ({currentTarget}: MouseEvent<HTMLInputElement>) => {
  try {
    currentTarget.showPicker();
  } catch {
    // Not offered by this browser, or already open: the box keeps working as a plain one.
  }
};

const PickerInput = ({
  type,
  shown,
  value,
  size,
  width,
  flex,
  ...inputProps
}: PickerInputProps & {type: 'date' | 'time'; shown: string}) => {
  const recipe = useRecipe({key: 'input'});

  return (
    <chakra.div position="relative" width={width ?? 'full'} flex={flex}>
      <chakra.div css={recipe({size})} display="flex" alignItems="center" pointerEvents="none" aria-hidden="true">
        {shown}
      </chakra.div>
      <Input
        {...inputProps}
        type={type}
        value={value}
        size={size}
        position="absolute"
        inset="0"
        opacity={0}
        cursor="pointer"
        onClick={openPicker}
      />
    </chakra.div>
  );
};

/** A day as day/month/year, whatever the device's format. Its value stays "YYYY-MM-DD". */
const DateInput = ({value, ...props}: PickerInputProps) => (
  <PickerInput {...props} type="date" value={value} shown={shownDate(value)} />
);

/** A time on a 24-hour clock, whatever the device's format. Its value stays "HH:MM". */
const TimeInput = ({value, ...props}: PickerInputProps) => (
  <PickerInput {...props} type="time" value={value} shown={value.slice(0, 5)} />
);

export {DateInput, TimeInput};
