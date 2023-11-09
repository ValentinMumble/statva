import {ActivityFilter} from './activity';
import {DetailedActivity} from './strava';

type ChartProps = {
  data: keyof DetailedActivity;
  formatter: (value: number) => string;
  filter?: Partial<ActivityFilter>;
};

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
  dataLabels: {
    enabled: false,
  },
  colors: ['darkOrange'],
});

export type {ChartProps};
export {getOptions};
