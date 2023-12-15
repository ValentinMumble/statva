import {Props} from 'react-apexcharts';
import {ActivityFilter} from './activity';
import {DetailedActivity} from './strava';

type ChartProps = {
  data: keyof DetailedActivity;
  dataLabel: string;
  formatter: (value: number) => string;
  filter?: Partial<ActivityFilter>;
} & Props;

const getOptions: (labels: string[], formatter: (value: number) => string) => ApexCharts.ApexOptions = (
  labels,
  formatter
) => ({
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
  colors: ['darkOrange'],
});

export type {ChartProps};
export {getOptions};
