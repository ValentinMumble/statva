import {Code} from '@chakra-ui/react';
import {AccordionItem, AccordionItemContent, AccordionItemTrigger, AccordionRoot} from './components/ui';
import {useEvents, useLabels} from './hooks';

const Export = () => {
  const [events] = useEvents();
  const [, labels] = useLabels();

  return (
    <AccordionRoot multiple={true} padding="100px">
      <AccordionItem value="events">
        <AccordionItemTrigger>Events 🪭</AccordionItemTrigger>
        <AccordionItemContent>
          <Code>{JSON.stringify(events)}</Code>
        </AccordionItemContent>
      </AccordionItem>
      <AccordionItem value="labels">
        <AccordionItemTrigger>Labels 🏷️</AccordionItemTrigger>
        <AccordionItemContent>
          <Code>{JSON.stringify(labels)}</Code>
        </AccordionItemContent>
      </AccordionItem>
    </AccordionRoot>
  );
};

export {Export};
