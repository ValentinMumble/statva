import {MetaAthlete, PolylineMap} from '.';
import {ActivityType} from './activity-type';

export interface SummaryActivity {
  id: number;
  achievement_count: number;
  athlete_count: number;
  athlete: MetaAthlete;
  average_speed: number;
  comment_count: number;
  commute: boolean;
  distance: number;
  elapsed_time: number;
  elev_high: number;
  elev_low: number;
  end_latlng: number[];
  external_id: string;
  flagged: boolean;
  has_kudoed: boolean;
  kudos_count: number;
  manual: boolean;
  map: PolylineMap;
  max_speed: number;
  moving_time: number;
  name: string;
  photo_count: number;
  private: boolean;
  start_date_local: Date;
  start_date: Date;
  start_latlng: number[];
  timezone: string;
  total_elevation_gain: number;
  total_photo_count: number;
  trainer: boolean;
  type: ActivityType;
  upload_id: number;
  workout_type: number;
}
