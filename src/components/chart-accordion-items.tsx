import {ReactNode} from 'react';
import {formatCalories, formatDistance, formatDistanceMeters, formatDuration} from '../models';
import {ActivityType} from '../models/strava';
import {
  ActivityTimeChart,
  AverageGearChart,
  ChainChart,
  CommuteSpeedChart,
  CostPerKmChart,
  CourtPieChart,
  DataLineChart,
  EddingtonChart,
  EddingtonDayChart,
  EventOdometerChart,
  EventTimelineChart,
  FinishPieChart,
  FTPChart,
  GearChart,
  GroupChart,
  HeartChart,
  NPGroupPieChart,
  PoolPieChart,
  ProgressChart,
  TimeframeChart,
  TrainingLoadChart,
} from './charts/lazy-charts';

export type AccordionItem = {label: string; component: ReactNode};

export const ACCORDION_ITEMS: AccordionItem[] = [
  {label: 'Chain rotation ⛓️', component: <ChainChart />},
  {label: 'Event odometer 📟', component: <EventOdometerChart />},
  {label: 'Event timeline 🎞️', component: <EventTimelineChart />},
  {
    label: 'Distance / time 📍',
    component: (
      <TimeframeChart data="distance" formatter={value => formatDistance(value, 1)} excludedTypes={[ActivityType.Tennis]} />
    ),
  },
  {label: 'Activities / time 🛹', component: <ActivityTimeChart />},
  {
    label: 'Commute / time 💼',
    component: (
      <TimeframeChart data="distance" formatter={value => formatDistance(value, 1)} filter={{withCommute: 'only'}} displayTypes={false} />
    ),
  },
  {label: 'Commute speed 🚴‍♂️', component: <CommuteSpeedChart />},
  {label: 'Moving / time ⏱️', component: <TimeframeChart data="moving_time" formatter={formatDuration} />},
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
      <TimeframeChart data="kilojoules" formatter={formatCalories} excludedTypes={[ActivityType.Tennis, ActivityType.Swim]} />
    ),
  },
  {label: 'FTP / time ⚡️', component: <FTPChart />},
  {label: 'Eddington / time 🧸', component: <EddingtonChart />},
  {label: 'Eddington bars 🍻', component: <EddingtonDayChart />},
  {label: 'Distance / gear 📍', component: <GearChart data="distance" formatter={value => formatDistance(value, 0)} type="pie" />},
  {label: 'Time / gear ⏱️', component: <GearChart data="moving_time" formatter={formatDuration} type="pie" />},
  {label: 'D+ / gear ⛰️', component: <GearChart data="total_elevation_gain" formatter={formatDistanceMeters} type="pie" />},
  {label: 'Average speed / bike 🏁', component: <AverageGearChart />},
  {label: 'N-Peloton / time 🦊', component: <TimeframeChart filter={{search: 'N-Peloton'}} data={1} displayTypes={false} />},
  {label: 'N-Peloton 🏁 & ⚡️', component: <ProgressChart search="N-Peloton" />},
  {label: 'N-Peloton finish pie 🍺', component: <FinishPieChart />},
  {label: 'N-Peloton group pie 🥧', component: <NPGroupPieChart />},
  {label: 'Pool pie 🏊‍♂️', component: <PoolPieChart />},
  {label: 'Court pie 🎾', component: <CourtPieChart />},
  {label: 'Group chart 👥', component: <GroupChart />},
  {label: 'Average 🫀 & ⚡️', component: <HeartChart />},
  {label: 'Suffer chart 🌶️', component: <DataLineChart data="suffer_score" />},
  {label: 'Cadence chart 🎡', component: <DataLineChart min={40} max={110} data="average_cadence" />},
  {label: 'Cost / km 💸', component: <CostPerKmChart />},
  {label: 'Training load 🏋️', component: <TrainingLoadChart />},
];
