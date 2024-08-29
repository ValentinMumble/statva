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
  yaxis: {labels: {formatter}},
  chart: {
    toolbar: {show: false},
    zoom: {enabled: false},
    background: 'transparent',
  },
  stroke: {curve: 'straight'},
  dataLabels: {enabled: false},
  markers: {size: [4]},
  colors: [
    '#e0700090',
    '#a2d0cf90',
    '#ffd96690',
    '#38761d90',
    '#a977a690',
    '#b5688890',
    '#bc5e6b90',
    '#c3665290',
    '#cb874590',
    '#cb874590',
  ],
  theme: {mode: 'dark'},
  ...additionalOptions,
});

export type {ChartProps};
export {getOptions};
