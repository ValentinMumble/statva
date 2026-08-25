import {ActivityFilter} from './activity';
import {Activity} from './strava';

type ChartType = 'area' | 'bar' | 'line' | 'pie';

type ChartProps = {
  data: keyof Activity | number;
  formatter?: (value: number) => string;
  filter?: Partial<ActivityFilter>;
  type?: ChartType;
};

export type {ChartProps, ChartType};
