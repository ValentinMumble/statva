import {ReactNode} from 'react';
import {Accordion, AccordionItem, AccordionButton, Box, AccordionIcon, AccordionPanel} from '@chakra-ui/react';
import {
  ProgressChart,
  MonthChart,
  EddingtonChart,
  GearChart,
  AverageGearChart,
  HeartChart,
  FTPChart,
  TypeMonthChart,
  ChainChart,
} from './charts';
import {formatDistance, formatDuration, formatElevation} from '../models';

const ACCORDION_ITEMS: {label: string; component: ReactNode}[] = [
  {
    label: 'Distance / time 🗺️',
    component: <MonthChart data="distance" dataLabel="🗺️" formatter={value => formatDistance(value, 0)} />,
  },
  {
    label: '🦈 Chain rotation ⛓️',
    component: <ChainChart />,
  },
  {
    label: 'Activities / time 🛹',
    component: <TypeMonthChart filter={{includedActivityTypes: [], minTime: 30 * 60}} />,
  },
  {
    label: 'Moving / time ⏱️',
    component: <MonthChart data="moving_time" dataLabel="⏱️" formatter={formatDuration} />,
  },
  {
    label: 'D+ / time ⛰️',
    component: (
      <MonthChart
        data="total_elevation_gain"
        dataLabel="⛰️"
        formatter={value => formatDistance(value, 1)}
        type="area"
      />
    ),
  },
  {
    label: 'FTP / time ⚡️',
    component: <FTPChart />,
  },
  {
    label: 'Eddington / time 🧸',
    component: <EddingtonChart />,
  },
  {
    label: 'Distance / bike 🚲',
    component: <GearChart data="distance" dataLabel="🗺️" formatter={value => formatDistance(value, 0)} type="pie" />,
  },
  {
    label: 'Time / bike ⏱️',
    component: <GearChart data="moving_time" dataLabel="⏱️" formatter={formatDuration} type="pie" />,
  },
  {
    label: 'D+ / bike ⛰️',
    component: <GearChart data="total_elevation_gain" dataLabel="⛰️" formatter={formatElevation} type="pie" />,
  },
  {
    label: 'Average speed / bike 🏁',
    component: <AverageGearChart />,
  },
  {
    label: 'N-Peloton 🏁 & ⚡️',
    component: <ProgressChart search="N-Peloton" />,
  },
  {
    label: 'Average 🫀 & ⚡️',
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
