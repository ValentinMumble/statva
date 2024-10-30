import {ReactNode, useState} from 'react';
import {AccordionItem} from '@chakra-ui/react';
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
  EventChart,
} from './charts';
import {formatCalories, formatDistance, formatDuration, formatElevation} from '../models';
import {AccordionItemContent, AccordionItemTrigger, AccordionRoot} from '../components/ui';

const ACCORDION_ITEMS: {label: string; component: ReactNode}[] = [
  {
    label: 'Chain rotation ⛓️',
    component: <ChainChart />,
  },
  {
    label: 'Event odometer 📟',
    component: <EventChart />,
  },
  {
    label: 'Distance / time 🗺️',
    component: <MonthChart data="distance" dataLabel="🗺️" formatter={value => formatDistance(value, 1)} />,
  },
  {
    label: 'Activities / time 🛹',
    component: <TypeMonthChart />,
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
    label: 'Calories / time 🍕',
    component: <MonthChart data="kilojoules" dataLabel="🍕" formatter={formatCalories} />,
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
  const [value, setValue] = useState<string[]>([ACCORDION_ITEMS[0].label]);

  return (
    <AccordionRoot multiple={true} value={value} onValueChange={({value}) => setValue(value)}>
      {ACCORDION_ITEMS.map(item => (
        <AccordionItem key={item.label} value={item.label}>
          <AccordionItemTrigger outline="none">{item.label}</AccordionItemTrigger>
          <AccordionItemContent padding={0} fontSize=".8em">
            {item.component}
          </AccordionItemContent>
        </AccordionItem>
      ))}
    </AccordionRoot>
  );
};

export {ChartAccordion};
