import Chart from 'react-apexcharts';
import {useActivities} from '../hooks';
import {formatSpeed} from '../models';

const MIN_CHART_SPEED = 26;
const MAX_CHART_SPEED = 35;

const options: ApexCharts.ApexOptions = {
  title: {
    text: 'N-Peloton average speed 💯',
    style: {
      fontSize: '18px',
    },
  },
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

const ProgressChart = () => {
  const activities = useActivities({
    search: 'N-Peloton',
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
