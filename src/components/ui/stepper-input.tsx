import {HStack, IconButton, NumberInput} from '@chakra-ui/react';
import {forwardRef} from 'react';
import {LuMinus, LuPlus} from 'react-icons/lu';

export interface StepperInputProps extends NumberInput.RootProps {
  label?: React.ReactNode;
}

export const StepperInput = forwardRef<HTMLDivElement, StepperInputProps>(function StepperInput(props, ref) {
  const {label, size, ...rest} = props;
  return (
    <NumberInput.Root size={size} {...rest} unstyled ref={ref}>
      {label && <NumberInput.Label>{label}</NumberInput.Label>}
      <HStack gap="2">
        <NumberInput.DecrementTrigger asChild>
          <IconButton variant="outline" size={props.size}>
            <LuMinus />
          </IconButton>
        </NumberInput.DecrementTrigger>
        <NumberInput.ValueText textAlign="center" fontSize="sm" minW="3ch" />
        <NumberInput.IncrementTrigger asChild>
          <IconButton variant="outline" size={props.size}>
            <LuPlus />
          </IconButton>
        </NumberInput.IncrementTrigger>
      </HStack>
    </NumberInput.Root>
  );
});
