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
        <DecrementTrigger size={size} />
        <NumberInput.ValueText textAlign="center" fontSize="sm" minW="3ch" />
        <IncrementTrigger size={size} />
      </HStack>
    </NumberInput.Root>
  );
});

const DecrementTrigger = forwardRef<
  HTMLButtonElement,
  NumberInput.DecrementTriggerProps & {
    size: StepperInputProps['size'];
  }
>(function DecrementTrigger(props, ref) {
  return (
    <NumberInput.DecrementTrigger {...props} asChild ref={ref}>
      <IconButton variant="outline" size={props.size}>
        <LuMinus />
      </IconButton>
    </NumberInput.DecrementTrigger>
  );
});

const IncrementTrigger = forwardRef<
  HTMLButtonElement,
  NumberInput.IncrementTriggerProps & {
    size: StepperInputProps['size'];
  }
>(function IncrementTrigger(props, ref) {
  return (
    <NumberInput.IncrementTrigger {...props} asChild ref={ref}>
      <IconButton variant="outline" size={props.size}>
        <LuPlus />
      </IconButton>
    </NumberInput.IncrementTrigger>
  );
});
