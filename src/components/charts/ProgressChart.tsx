import Chart from 'react-apexcharts';
import {useActivities} from '../../hooks';
import {formatPower, formatSpeed, getOptions} from '../../models';

const options: ApexCharts.ApexOptions = {
  xaxis: {type: 'datetime'},
  yaxis: [
    {
      labels: {formatter: (value: number) => formatSpeed(value)},
      min: 22 / 3.6,
      max: 40 / 3.6,
    },
    {
      opposite: true,
      labels: {formatter: formatPower},
      min: 120,
      max: 260,
    },
  ],
  colors: ['#aba19c', '#e09200'],
  stroke: {curve: 'smooth'},
  fill: {type: 'gradient'},
};

type ProgressChartProps = {
  search: string;
};

const ProgressChart = ({search}: ProgressChartProps) => {
  const [activities] = useActivities({
    search,
    withCommute: false,
    withPrivate: false,
    sort: 'date',
    sortDirection: 'asc',
  });

  const averageSpeedSerie = (activities ?? []).map(({average_speed, start_date}) => [
    new Date(start_date).getTime(),
    average_speed,
  ]);
  const averagePowerSerie = (activities ?? []).map(({weighted_average_watts, start_date}) => [
    new Date(start_date).getTime(),
    weighted_average_watts ?? null,
  ]);
  const series = [
    {name: '🏁', data: averageSpeedSerie},
    {name: '⚡️', data: averagePowerSerie as number[][]},
  ];

  return <Chart options={getOptions([], undefined, options)} series={series} type="line" height={400} />;
};

export {ProgressChart};
