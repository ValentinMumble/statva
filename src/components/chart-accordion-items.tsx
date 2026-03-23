import {lazy, ReactNode} from 'react';
import {formatCalories, formatDistance, formatDistanceMeters, formatDuration} from '../models';
import {ActivityType} from '../models/strava';

const ChainChart = lazy(() => import('./charts/ChainChart').then(m => ({default: m.ChainChart})));
const EventOdometerChart = lazy(() =>
  import('./charts/EventOdometerChart').then(m => ({default: m.EventOdometerChart})),
);
const EventTimelineChart = lazy(() =>
  import('./charts/EventTimelineChart').then(m => ({default: m.EventTimelineChart})),
);
const TimeframeChart = lazy(() => import('./charts/TimeframeChart').then(m => ({default: m.TimeframeChart})));
const ActivityTimeChart = lazy(() =>
  import('./charts/ActivityTimeChart').then(m => ({default: m.ActivityTimeChart})),
);
const CommuteSpeedChart = lazy(() =>
  import('./charts/CommuteSpeedChart').then(m => ({default: m.CommuteSpeedChart})),
);
const FTPChart = lazy(() => import('./charts/FTPChart').then(m => ({default: m.FTPChart})));
const EddingtonChart = lazy(() => import('./charts/EddingtonChart').then(m => ({default: m.EddingtonChart})));
const EddingtonDayChart = lazy(() =>
  import('./charts/EddingtonDayChart').then(m => ({default: m.EddingtonDayChart})),
);
const GearChart = lazy(() => import('./charts/GearChart').then(m => ({default: m.GearChart})));
const AverageGearChart = lazy(() => import('./charts/AverageGearChart').then(m => ({default: m.AverageGearChart})));
const ProgressChart = lazy(() => import('./charts/ProgressChart').then(m => ({default: m.ProgressChart})));
const FinishPieChart = lazy(() => import('./charts/FinishPieChart').then(m => ({default: m.FinishPieChart})));
const NPGroupPieChart = lazy(() => import('./charts/NPGroupPieChart').then(m => ({default: m.NPGroupPieChart})));
const PoolPieChart = lazy(() => import('./charts/PoolPieChart').then(m => ({default: m.PoolPieChart})));
const CourtPieChart = lazy(() => import('./charts/CourtPieChart').then(m => ({default: m.CourtPieChart})));
const GroupChart = lazy(() => import('./charts/GroupChart').then(m => ({default: m.GroupChart})));
const HeartChart = lazy(() => import('./charts/HeartChart').then(m => ({default: m.HeartChart})));
const DataLineChart = lazy(() => import('./charts/DataLineChart').then(m => ({default: m.DataLineChart})));
const CostPerKmChart = lazy(() => import('./charts/CostPerKmChart').then(m => ({default: m.CostPerKmChart})));
const TrainingLoadChart = lazy(() =>
  import('./charts/TrainingLoadChart').then(m => ({default: m.TrainingLoadChart})),
);

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
