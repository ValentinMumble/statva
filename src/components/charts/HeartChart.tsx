import Chart from 'react-apexcharts';
import {useActivities} from '../../hooks';
import {ActivityType} from '../../models/strava';

const MIN_DISTANCE_METERS = 30 * 1000;

const options: ApexCharts.ApexOptions = {
  colors: ['#8ac448', '#b18a83'],
  stroke: {
    curve: 'smooth',
    width: 3,
  },
  fill: {
    type: 'gradient',
    gradient: {
      type: 'vertical',
      gradientToColors: ['#fd8f35', '#fd3549'],
    },
  },
  chart: {
    toolbar: {show: false},
    zoom: {enabled: false},
  },
  yaxis: [
    {
      max: 190,
      min: 40,
    },
    {
      opposite: true,
      min: 40,
      max: 110,
    },
  ],
};

const HeartChart = () => {
  const [activities] = useActivities({
    withCommute: true,
    withPrivate: true,
    sort: 'date',
    sortDirection: 'asc',
    includedActivityTypes: [ActivityType.Ride, ActivityType.GravelRide, ActivityType.VirtualRide],
  });

  const rides = activities.filter(
    ({average_heartrate, average_cadence, distance}) =>
      (0 < (average_heartrate ?? 0) || 0 < (average_cadence ?? 0)) && MIN_DISTANCE_METERS < distance
  );

  const heartRateSerie = rides.map(({average_heartrate}) => (average_heartrate ? Math.round(average_heartrate) : null));
  const cadenceSerie = rides.map(({average_cadence}) => (average_cadence ? Math.round(average_cadence) : null));
  const labels = rides.map(({start_date}) => new Date(start_date).toLocaleDateString());
  const series = [
    {name: '🫀', data: heartRateSerie},
    {name: '🎡', data: cadenceSerie},
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

export {HeartChart};
