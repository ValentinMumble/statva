import {Props} from 'react-apexcharts';
import {ActivityFilter} from './activity';
import {Activity} from './strava';

type ChartProps = {
  data: keyof Activity | number;
  formatter?: (value: number) => string;
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
  stroke: {curve: 'straight', width: 1.5, colors: ['#000']},
  dataLabels: {enabled: false},
  markers: {size: [3]},
  grid: {borderColor: '#FFFFFF30'},
  fill: {type: 'solid'},
  colors: [
    '#e0700070',
    '#a2d0cf70',
    '#ffd96670',
    '#38761d70',
    '#a977a670',
    '#b5688870',
    '#bc5e6b70',
    '#c3665270',
    '#cb874570',
    '#cb874570',
  ],
  theme: {mode: 'dark'},
  ...additionalOptions,
});

export type {ChartProps};
export {getOptions};
