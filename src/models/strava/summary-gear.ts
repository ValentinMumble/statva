import {ResourceState} from './resource-state';

export interface SummaryGear {
  id: string;
  resource_state: ResourceState;
  primary: boolean;
  name: string;
  distance: number;
}
