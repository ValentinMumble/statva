import {ResourceState} from './resource-state';

export interface SummaryGear {
  id: string;
  resource_state: ResourceState;
  nickname: string;
  primary: boolean;
  name: string;
  distance: number;
  converted_distance: number;
  retired: boolean;
}
