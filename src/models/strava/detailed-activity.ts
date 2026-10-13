import {MetaAthlete} from './meta-athlete';
import {PolylineMap} from './polyline-map';
import {SummaryGear} from './summary-gear';

interface SegmentEffort {
  kom_rank: number | null;
}

export interface DetailedActivity {
  achievement_count: number;
  athlete_count: number;
  athlete: MetaAthlete;
  available_zones?: string[];
  average_cadence?: number;
  average_heartrate?: number;
  average_speed: number;
  average_temp?: number;
  average_watts?: number;
  calories?: number;
  comment_count: number;
  commute: boolean;
  description: string;
  device_name: string;
  device_watts: boolean;
  display_hide_heartrate_option: boolean;
  distance: number;
  elapsed_time: number;
  elev_high: number;
  elev_low: number;
  embed_token: string;
  end_latlng: number[];
  external_id: string;
  flagged: boolean;
  from_accepted_tag: boolean;
  gear_id: string | null;
  gear: SummaryGear;
  has_heartrate: boolean;
  has_kudoed: boolean;
  heartrate_opt_out: boolean;
  hide_from_home: boolean;
  id: number;
  kilojoules: number;
  kudos_count: number;
  laps: unknown[];
  location_city: string | null;
  location_country: string | null;
  location_state: string | null;
  manual: boolean;
  map: PolylineMap;
  max_heartrate: number;
  max_speed: number;
  max_watts: number;
  moving_time: number;
  name: string;
  perceived_exertion: number | null;
  photo_count: number;
  photos: {
    primary?: {
      unique_id: string;
      urls: Record<number, string>;
      source: number;
      media_type: number;
    };
    use_primary_photo: boolean;
    count: number;
  };
  pr_count: number;
  prefer_perceived_exertion: boolean;
  private: boolean;
  private_note?: string;
  resource_state: number;
  segment_efforts: SegmentEffort[];
  splits_metric: unknown[];
  splits_standard: unknown[];
  sport_type: string;
  start_date_local: string;
  start_date: string;
  start_latlng: number[];
  stats_visibility: {type: string; visibility: string}[];
  suffer_score: number;
  timezone: string;
  total_elevation_gain: number;
  total_photo_count: number;
  trainer: boolean;
  type: string;
  upload_id_str: string;
  upload_id: number;
  utc_offset: number;
  visibility: string;
  weighted_average_watts: number;
  workout_type: number;
  // Added by Statva's server, not Strava, from the power data (null without a power meter):
  normalized_power?: number | null;
  // best average power over each duration, in seconds;
  power_curve?: Record<string, number> | null;
  // moving seconds per 25 W band, from 0 W up;
  power_histogram?: number[] | null;
  // percent more heart rate for the same power in the second half (long rides only).
  heart_rate_drift?: number | null;
}
