import {ReactNode} from 'react';
import {Accordion, AccordionItem, AccordionButton, Box, AccordionIcon, AccordionPanel} from '@chakra-ui/react';
import {ProgressChart, MonthChart, EddingtonChart, GearChart, AverageGearChart, HeartChart} from './charts';
import {formatDistance, formatDuration} from '../models';

const ACCORDION_ITEMS: {label: string; component: ReactNode}[] = [
  {
    label: 'N-Peloton 🏁 & ⚡️',
    component: <ProgressChart search="N-Peloton" />,
  },
  {
    label: 'Distance / time 🗺️',
    component: <MonthChart data="distance" dataLabel="🗺️" formatter={value => formatDistance(value, 0)} />,
  },
  {
    label: 'D+ / time ⛰️',
    component: (
      <MonthChart data="total_elevation_gain" dataLabel="⛰️" formatter={value => formatDistance(value)} type="area" />
    ),
  },
  {
    label: 'Eddington / month 🧸',
    component: <EddingtonChart startYear={2023} />,
  },
  {
    label: 'Distance / bike 🚲',
    component: <GearChart dataLabel="🗺️" data="distance" formatter={value => formatDistance(value, 0)} type="pie" />,
  },
  {
    label: 'Time / bike ⏱️',
    component: <GearChart data="moving_time" dataLabel="⏱️" formatter={formatDuration} type="pie" />,
  },
  {
    label: 'Average speed / bike 🏁',
    component: <AverageGearChart />,
  },
  {
    label: 'Average 🫀 & 🎡',
    component: <HeartChart />,
  },
];

const ChartAccordion = () => {
  return (
    <Accordion defaultIndex={[0]} allowMultiple={true}>
      {ACCORDION_ITEMS.map(item => (
        <AccordionItem key={item.label}>
          <AccordionButton>
            <Box as="b" flex="1" textAlign="left">
              {item.label}
            </Box>
            <AccordionIcon />
          </AccordionButton>
          <AccordionPanel padding={0}>{item.component}</AccordionPanel>
        </AccordionItem>
      ))}
    </Accordion>
  );
};

export {ChartAccordion};
