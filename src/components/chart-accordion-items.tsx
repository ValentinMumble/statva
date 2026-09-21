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

export type ChartGroup = 'Gear' | 'Volume' | 'Effort' | 'Eddington' | 'N-Peloton' | 'Elsewhere';
export type AccordionItem = {label: string; group: ChartGroup; component: ReactNode};

// Order the groups are shown in, most looked at first.
export const CHART_GROUPS: ChartGroup[] = ['Gear', 'Volume', 'Effort', 'Eddington', 'N-Peloton', 'Elsewhere'];

export const ACCORDION_ITEMS: AccordionItem[] = [
  {label: 'Chain rotation ⛓️', group: 'Gear', component: <ChainChart />},
  {label: 'Event odometer 📟', group: 'Gear', component: <EventOdometerChart />},
  {label: 'Event timeline 🎞️', group: 'Gear', component: <EventTimelineChart />},
  {
    label: 'Distance / time 📍', group: 'Volume',
    component: (
      <TimeframeChart data="distance" formatter={value => formatDistance(value, 1)} excludedTypes={[ActivityType.Tennis]} />
    ),
  },
  {label: 'Activities / time 🛹', group: 'Volume', component: <ActivityTimeChart />},
  {
    label: 'Commute / time 💼', group: 'Volume',
    component: (
      <TimeframeChart data="distance" formatter={value => formatDistance(value, 1)} filter={{withCommute: 'only'}} displayTypes={false} />
    ),
  },
  {label: 'Commute speed 🚴‍♂️', group: 'Volume', component: <CommuteSpeedChart />},
  {label: 'Moving / time ⏱️', group: 'Volume', component: <TimeframeChart data="moving_time" formatter={formatDuration} />},
  {
    label: 'Suffer score / time 🌶️', group: 'Effort',
    component: <TimeframeChart data="suffer_score" formatter={value => value.toFixed(0)} displayTypes={false} />,
  },
  {
    label: 'D+ / time ⛰️', group: 'Volume',
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
    label: 'Calories / time 🍕', group: 'Volume',
    component: (
      <TimeframeChart data="kilojoules" formatter={formatCalories} excludedTypes={[ActivityType.Tennis, ActivityType.Swim]} />
    ),
  },
  {label: 'FTP / time ⚡️', group: 'Effort', component: <FTPChart />},
  {label: 'Eddington / time 🧸', group: 'Eddington', component: <EddingtonChart />},
  {label: 'Eddington bars 🍻', group: 'Eddington', component: <EddingtonDayChart />},
  {label: 'Distance / gear 📍', group: 'Gear', component: <GearChart data="distance" formatter={value => formatDistance(value, 0)} type="pie" />},
  {label: 'Time / gear ⏱️', group: 'Gear', component: <GearChart data="moving_time" formatter={formatDuration} type="pie" />},
  {label: 'D+ / gear ⛰️', group: 'Gear', component: <GearChart data="total_elevation_gain" formatter={formatDistanceMeters} type="pie" />},
  {label: 'Average speed / bike 🏁', group: 'Gear', component: <AverageGearChart />},
  {label: 'N-Peloton / time 🦊', group: 'N-Peloton', component: <TimeframeChart filter={{search: 'N-Peloton'}} data={1} displayTypes={false} />},
  {label: 'N-Peloton 🏁 & ⚡️', group: 'N-Peloton', component: <ProgressChart search="N-Peloton" />},
  {label: 'N-Peloton finish pie 🍺', group: 'N-Peloton', component: <FinishPieChart />},
  {label: 'N-Peloton group pie 🥧', group: 'N-Peloton', component: <NPGroupPieChart />},
  {label: 'Pool pie 🏊‍♂️', group: 'Elsewhere', component: <PoolPieChart />},
  {label: 'Court pie 🎾', group: 'Elsewhere', component: <CourtPieChart />},
  {label: 'Group chart 👥', group: 'Elsewhere', component: <GroupChart />},
  {label: 'Average 🫀 & ⚡️', group: 'Effort', component: <HeartChart />},
  {label: 'Suffer chart 🌶️', group: 'Effort', component: <DataLineChart data="suffer_score" />},
  {label: 'Cadence chart 🎡', group: 'Effort', component: <DataLineChart min={40} max={110} data="average_cadence" />},
  {label: 'Cost / km 💸 🦈', group: 'Gear', component: <CostPerKmChart />},
  {label: 'Training load 🏋️', group: 'Effort', component: <TrainingLoadChart />},
];
