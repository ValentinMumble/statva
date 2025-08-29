import {ReactNode, useState} from 'react';
import {Accordion, Span} from '@chakra-ui/react';
import {
  ProgressChart,
  TimeframeChart,
  EddingtonChart,
  GearChart,
  AverageGearChart,
  HeartChart,
  FTPChart,
  ActivityTimeChart,
  ChainChart,
  EventOdometerChart,
  DataLineChart,
  EddingtonDayChart,
  EventTimelineChart,
  FinishPieChart,
  GroupChart,
  PoolPieChart,
  NPGroupPieChart,
} from './charts';
import {formatCalories, formatDistance, formatDistanceMeters, formatDuration} from '../models';
import {ActivityType} from '../models/strava';

const ACCORDION_ITEMS: {label: string; component: ReactNode}[] = [
  {
    label: 'Chain rotation ⛓️',
    component: <ChainChart />,
  },
  {
    label: 'Event odometer 📟',
    component: <EventOdometerChart />,
  },
  {
    label: 'Event timeline 🎞️',
    component: <EventTimelineChart />,
  },
  {
    label: 'Distance / time 📍',
    component: (
      <TimeframeChart
        data="distance"
        formatter={value => formatDistance(value, 1)}
        excludedTypes={[ActivityType.Tennis]}
      />
    ),
  },
  {
    label: 'Activities / time 🛹',
    component: <ActivityTimeChart />,
  },
  {
    label: 'Moving / time ⏱️',
    component: <TimeframeChart data="moving_time" formatter={formatDuration} />,
  },
  {
    label: 'Suffer score / time 🌶️',
    component: <TimeframeChart data="suffer_score" formatter={value => value.toFixed(0)} displayTypes={false} />,
  },
  {
    label: 'D+ / time ⛰️',
    component: (
      <TimeframeChart
        data="total_elevation_gain"
        formatter={value => formatDistance(value, 1)}
        type="area"
        excludedTypes={[ActivityType.Tennis, ActivityType.Swim]}
      />
    ),
  },
  {
    label: 'Calories / time 🍕',
    component: (
      <TimeframeChart
        data="kilojoules"
        formatter={formatCalories}
        excludedTypes={[ActivityType.Tennis, ActivityType.Swim]}
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
    label: 'Eddington bars 🍻',
    component: <EddingtonDayChart />,
  },
  {
    label: 'Distance / gear 📍',
    component: <GearChart data="distance" formatter={value => formatDistance(value, 0)} type="pie" />,
  },
  {
    label: 'Time / gear ⏱️',
    component: <GearChart data="moving_time" formatter={formatDuration} type="pie" />,
  },
  {
    label: 'D+ / gear ⛰️',
    component: <GearChart data="total_elevation_gain" formatter={formatDistanceMeters} type="pie" />,
  },
  {
    label: 'Average speed / bike 🏁',
    component: <AverageGearChart />,
  },
  {
    label: 'N-Peloton / time 🦊',
    component: <TimeframeChart filter={{search: 'N-Peloton'}} data={1} displayTypes={false} />,
  },
  {
    label: 'N-Peloton 🏁 & ⚡️',
    component: <ProgressChart search="N-Peloton" />,
  },
  {
    label: 'N-Peloton finish pie 🍺',
    component: <FinishPieChart />,
  },
  {
    label: 'N-Peloton group pie 🥧',
    component: <NPGroupPieChart />,
  },
  {
    label: 'Pool pie 🏊‍♂️',
    component: <PoolPieChart />,
  },
  {
    label: 'Group chart 👥',
    component: <GroupChart />,
  },
  {
    label: 'Average 🫀 & ⚡️',
    component: <HeartChart />,
  },
  {
    label: 'Suffer chart 🌶️',
    component: <DataLineChart data="suffer_score" />,
  },
  {
    label: 'Cadence chart 🎡',
    component: <DataLineChart min={40} max={110} data="average_cadence" />,
  },
];

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
            {item.component}
          </Accordion.ItemContent>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
};

export {ChartAccordion};
