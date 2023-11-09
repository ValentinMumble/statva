import Chart from 'react-apexcharts';
import {useActivities} from '../hooks';
import {formatSpeed} from '../models';

const MIN_CHART_SPEED = 26;
const MAX_CHART_SPEED = 35;

const options: ApexCharts.ApexOptions = {
  yaxis: {
    labels: {
      formatter: (value: number) => formatSpeed(value),
    },
    min: MIN_CHART_SPEED / 3.6,
    max: MAX_CHART_SPEED / 3.6,
  },
  colors: ['orange'],
  stroke: {
    curve: 'smooth',
  },
  fill: {
    type: 'gradient',
  },
  markers: {
    size: [5],
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
  const labels = activities.map(activity => new Date(activity.start_date_local).toLocaleDateString());
  const series = [{name: 'Average speed', data: averageSpeedSerie}];

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
