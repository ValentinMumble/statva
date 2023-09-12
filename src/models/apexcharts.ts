import {DetailedActivity} from './strava';

type ChartProps = {
  [K in keyof DetailedActivity]: {
    data: K;
    title: string;
    formatter: (value: number) => string;
  };
}[keyof DetailedActivity];

const getOptions: (title: string, labels: string[], formatter: (value: number) => string) => ApexCharts.ApexOptions = (
  title,
  labels,
  formatter
) => ({
  labels,
  title: {
    text: title,
    style: {
      fontSize: '18px',
    },
  },
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
