import {lazy} from 'react';

export const ChainChart = lazy(() => import('./ChainChart').then(m => ({default: m.ChainChart})));
export const EventOdometerChart = lazy(() =>
  import('./EventOdometerChart').then(m => ({default: m.EventOdometerChart})),
);
export const EventTimelineChart = lazy(() =>
  import('./EventTimelineChart').then(m => ({default: m.EventTimelineChart})),
);
export const TimeframeChart = lazy(() => import('./TimeframeChart').then(m => ({default: m.TimeframeChart})));
export const ActivityTimeChart = lazy(() =>
  import('./ActivityTimeChart').then(m => ({default: m.ActivityTimeChart})),
);
export const CommuteSpeedChart = lazy(() =>
  import('./CommuteSpeedChart').then(m => ({default: m.CommuteSpeedChart})),
);
export const FTPChart = lazy(() => import('./FTPChart').then(m => ({default: m.FTPChart})));
export const EddingtonChart = lazy(() => import('./EddingtonChart').then(m => ({default: m.EddingtonChart})));
export const EddingtonDayChart = lazy(() =>
  import('./EddingtonDayChart').then(m => ({default: m.EddingtonDayChart})),
);
export const GearChart = lazy(() => import('./GearChart').then(m => ({default: m.GearChart})));
export const AverageGearChart = lazy(() => import('./AverageGearChart').then(m => ({default: m.AverageGearChart})));
export const ProgressChart = lazy(() => import('./ProgressChart').then(m => ({default: m.ProgressChart})));
export const FinishPieChart = lazy(() => import('./FinishPieChart').then(m => ({default: m.FinishPieChart})));
export const NPGroupPieChart = lazy(() => import('./NPGroupPieChart').then(m => ({default: m.NPGroupPieChart})));
export const PoolPieChart = lazy(() => import('./PoolPieChart').then(m => ({default: m.PoolPieChart})));
export const CourtPieChart = lazy(() => import('./CourtPieChart').then(m => ({default: m.CourtPieChart})));
export const GroupChart = lazy(() => import('./GroupChart').then(m => ({default: m.GroupChart})));
export const HeartChart = lazy(() => import('./HeartChart').then(m => ({default: m.HeartChart})));
export const DataLineChart = lazy(() => import('./DataLineChart').then(m => ({default: m.DataLineChart})));
export const CostPerKmChart = lazy(() => import('./CostPerKmChart').then(m => ({default: m.CostPerKmChart})));
export const PowerCurveChart = lazy(() => import('./PowerCurveChart').then(m => ({default: m.PowerCurveChart})));
export const AerobicFitnessChart = lazy(() =>
  import('./AerobicFitnessChart').then(m => ({default: m.AerobicFitnessChart})),
);
export const PowerZonesChart = lazy(() => import('./PowerZonesChart').then(m => ({default: m.PowerZonesChart})));
export const HeartRateDriftChart = lazy(() =>
  import('./HeartRateDriftChart').then(m => ({default: m.HeartRateDriftChart})),
);
export const RunBestTimes = lazy(() => import('./RunBestTimes').then(m => ({default: m.RunBestTimes})));
export const CommuteRoutes = lazy(() => import('./CommuteRoutes').then(m => ({default: m.CommuteRoutes})));
