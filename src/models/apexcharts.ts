import {Props} from 'react-apexcharts';
import {ActivityFilter} from './activity';
import {DetailedActivity} from './strava';

type ChartProps = {
  data: keyof DetailedActivity | number;
  dataLabel: string;
  formatter: (value: number) => string;
  filter?: Partial<ActivityFilter>;
} & Props;

const getOptions: (
  labels: string[],
  formatter?: (value: number, opts?: any) => string,
  additionalOptions?: Partial<ApexCharts.ApexOptions>
) => ApexCharts.ApexOptions = (labels, formatter, additionalOptions) => ({
  labels,
  yaxis: {
    labels: {
      formatter,
    },
  },
  chart: {
    toolbar: {show: false},
    zoom: {enabled: false},
  },
  stroke: {curve: 'straight'},
  dataLabels: {
    enabled: false,
  },
  colors: ['#e07000', '#a2d0cf', '#ffd966', '#38761d', '#a977a6', '#b56888', '#bc5e6b', '#c36652', '#cb8745'],
  ...additionalOptions,
});

export type {ChartProps};
export {getOptions};
