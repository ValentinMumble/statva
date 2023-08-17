import {ResourceState} from './resource-state';

export interface DetailedGear {
  id: string;
  resource_state: ResourceState;
  primary: boolean;
  name: string;
  distance: number;
  brand_name: string;
  model_name: string;
  frame_type: number;
  description: string;
}
