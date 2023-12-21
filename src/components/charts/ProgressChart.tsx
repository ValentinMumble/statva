import Chart from 'react-apexcharts';
import {useActivities} from '../../hooks';
import {formatSpeed} from '../../models';

const options: ApexCharts.ApexOptions = {
  yaxis: [
    {
      labels: {
        formatter: (value: number) => formatSpeed(value),
      },
      min: 26 / 3.6,
      max: 35 / 3.6,
    },
    {
      opposite: true,
      labels: {
        formatter: (value: number) => `${Math.round(value)} W`,
      },
      min: 120,
      max: 260,
    },
  ],
  colors: ['#e09200', '#aba19c'],
  stroke: {
    curve: 'smooth',
    width: 4,
  },
  fill: {type: 'gradient'},
  markers: {size: [4]},
  chart: {
    toolbar: {show: false},
    zoom: {enabled: false},
  },
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

  const averageSpeedSerie = activities.map(({average_speed}) => average_speed);
  const averagePowerSerie = activities.map(({average_watts}) => average_watts ?? 0);
  const labels = activities.map(({start_date}) => new Date(start_date).toLocaleDateString());
  const series = [
    {name: '🏁', data: averageSpeedSerie},
    {name: '⚡️', data: averagePowerSerie},
  ];

  return (
    <Chart
      options={{
        ...options,
        labels,
      }}
      series={series}
      type="line"
      height={400}
    />
  );
};

export {ProgressChart};
