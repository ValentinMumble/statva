import {Suspense, useState} from 'react';
import {Accordion, Span, Spinner} from '@chakra-ui/react';
import {ACCORDION_ITEMS} from './chart-accordion-items';

const ChartFallback = () => <Spinner size="lg" margin={8} />;

const ChartAccordion = () => {
  const [value, setValue] = useState<string[]>([ACCORDION_ITEMS[0].label]);

  return (
    <Accordion.Root multiple={true} value={value} onValueChange={({value}) => setValue(value)}>
      {ACCORDION_ITEMS.map(item => (
        <Accordion.Item key={item.label} value={item.label}>
          <Accordion.ItemTrigger outline={0}>
            <Span flex={1}>{item.label}</Span>
            <Accordion.ItemIndicator />
          </Accordion.ItemTrigger>
          <Accordion.ItemContent padding={0} fontSize=".8em">
            {value.includes(item.label) && (
              <Suspense fallback={<ChartFallback />}>{item.component}</Suspense>
            )}
          </Accordion.ItemContent>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
};

export {ChartAccordion};
