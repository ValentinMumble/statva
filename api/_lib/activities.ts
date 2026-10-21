// Strava objects are large and loosely typed here: only the fields Statva touches are named.
type StravaActivity = {
  id: number;
  start_date: string;
  segment_efforts?: {kom_rank?: number | null}[];
  map?: {id?: string; summary_polyline?: string; polyline?: string};
  [field: string]: unknown;
};

// Heavy fields of a detailed activity that nothing in Statva reads.
const DROPPED_FROM_DETAILS = ['splits_metric', 'splits_standard', 'laps', 'similar_activities', 'stats_visibility'];

// What a summary keeps out: the long lists and the full-resolution track.
const DROPPED_FROM_SUMMARY = [
  ...DROPPED_FROM_DETAILS,
  'segment_efforts',
  'best_efforts',
  'description',
  'private_note',
  'photos',
];

const without = (activity: StravaActivity, fields: string[]): StravaActivity =>
  Object.fromEntries(Object.entries(activity).filter(([field]) => !fields.includes(field))) as StravaActivity;

/** A detailed activity as stored: segment efforts cut down to the KOM rank, the rest as Strava sends it. */
const cleanDetail = (activity: StravaActivity): StravaActivity => ({
  ...without(activity, DROPPED_FROM_DETAILS),
  segment_efforts: (activity.segment_efforts ?? []).map(({kom_rank}) => ({kom_rank: kom_rank ?? null})),
});

/** The list entry for an activity, from a detailed one (the webhook only gets details). */
const summaryOf = (activity: StravaActivity): StravaActivity => {
  const summary = without(activity, DROPPED_FROM_SUMMARY);

  return undefined === activity.map
    ? summary
    : {...summary, map: {id: activity.map.id, summary_polyline: activity.map.summary_polyline}};
};

export {cleanDetail, summaryOf};
export type {StravaActivity};
