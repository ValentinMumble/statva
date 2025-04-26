import {PolylineMap} from './polyline-map';

type Route = {
  private: boolean;
  distance: number;
  athlete: string;
  description: string;
  created_at: string;
  elevation_gain: number;
  type: number;
  estimated_moving_time: number;
  waypoints: any[];
  segments: any[];
  starred: boolean;
  updated_at: string;
  sub_type: number;
  id_str: string;
  name: string;
  id: number;
  map: PolylineMap;
  timestamp: number;
  map_urls: {
    dark_url: string;
    light_url: string;
    url: string;
    retina_url: string;
  }
};

export type {Route};
