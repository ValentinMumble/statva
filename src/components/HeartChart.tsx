import Chart from 'react-apexcharts';
import {useActivities} from '../hooks';

const MIN_DISTANCE_METERS = 40 * 1000;

const options: ApexCharts.ApexOptions = {
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

const HeartChart = () => {
  const activities = useActivities({
    withCommute: true,
    withPrivate: true,
    sort: 'date',
    sortDirection: 'asc',
  });

  if (null === activities) {
    return null;
  }

  const filteredActivities = activities.filter(
    ({average_heartrate, distance}) => 0 < (average_heartrate ?? 0) && MIN_DISTANCE_METERS < distance
  );

  const averageHeartRateSerie = filteredActivities.map(activity => activity.average_heartrate ?? 0);
  const labels = filteredActivities.map(activity => new Date(activity.start_date_local).toLocaleDateString());
  const series = [{name: 'Average heart rate', data: averageHeartRateSerie}];

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

export {HeartChart};
