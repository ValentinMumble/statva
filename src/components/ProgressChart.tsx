import Chart from 'react-apexcharts';
import {useActivities} from '../hooks';
import {formatSpeed} from '../models';

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
        formatter: (value: number) => `${value.toFixed(0)} W`,
      },
      min: 120,
      max: 260,
    },
  ],
  colors: ['#ffa500', '#c04000'],
  stroke: {
    curve: 'smooth',
    width: 4,
  },
  fill: {
    type: 'gradient',
  },
  markers: {
    size: [4],
  },
  chart: {
    toolbar: {show: false},
    zoom: {enabled: false},
  },
};

type ProgressChartProps = {
  search: string;
};

const ProgressChart = ({search}: ProgressChartProps) => {
  const activities = useActivities({
    search,
    withCommute: false,
    withPrivate: false,
    sort: 'date',
    sortDirection: 'asc',
  });

  if (null === activities) {
    return null;
  }

  const averageSpeedSerie = activities.map(activity => activity.average_speed);
  const averagePowerSerie = activities.map(activity => activity.average_watts ?? 0);
  const labels = activities.map(activity => new Date(activity.start_date_local).toLocaleDateString());
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
