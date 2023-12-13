import Chart from 'react-apexcharts';
import {useActivities} from '../../hooks';

const MIN_DISTANCE_METERS = 30 * 1000;

const options: ApexCharts.ApexOptions = {
  colors: ['#7ab933'],
  stroke: {
    curve: 'smooth',
    width: 4,
  },
  fill: {
    type: 'gradient',
    gradient: {
      type: 'vertical',
      gradientToColors: ['#fd8f35'],
    },
  },
  markers: {size: [4]},
  chart: {
    toolbar: {show: false},
    zoom: {enabled: false},
  },
};

const HeartChart = () => {
  const [activities] = useActivities({
    withCommute: true,
    withPrivate: true,
    sort: 'date',
    sortDirection: 'asc',
  });

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
