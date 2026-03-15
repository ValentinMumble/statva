import {DetailedActivity} from './strava';

const cleanActivity = (activity: DetailedActivity): DetailedActivity => {
  activity['segment_efforts'] = activity['segment_efforts'].map(effort => ({kom_rank: effort.kom_rank}));
  activity['splits_metric'] = [];
  activity['splits_standard'] = [];
  activity['laps'] = [];

  return activity;
};

const hasKom = (activity: DetailedActivity | null): boolean =>
  activity?.segment_efforts.some(effort => effort.kom_rank === 1) ?? false;

const isDetailedActivity = (activity: DetailedActivity): activity is DetailedActivity =>
  'id' in activity && 'name' in activity && 'type' in activity && 'start_date' in activity && 'description' in activity;

const extractNormalizedPower = (activity: DetailedActivity | null): number | null =>
  Number(activity?.private_note?.match(/NP:\s*(\d+)/)?.[1]) || null;

export {cleanActivity, extractNormalizedPower, hasKom, isDetailedActivity};
