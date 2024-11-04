import Chart from 'react-apexcharts';
import {useActivities} from '../../hooks';
import {ActivityType} from '../../models/strava';
import {getOptions, getTypes} from '../../models';

const MIN_DISTANCE_METERS = 30 * 1000;

const options: ApexCharts.ApexOptions = {
  colors: ['#8ac448', '#bfaf7d'],
  stroke: {
    curve: 'smooth',
    width: 3,
  },
  fill: {
    type: 'gradient',
    gradient: {
      type: 'vertical',
      gradientToColors: ['#fd8f35', '#fdc135'],
    },
  },
  markers: {size: [0]},
  yaxis: [
    {
      max: 190,
      min: 60,
    },
    {
      opposite: true,
      min: 80,
      max: 320,
    },
  ],
};

const HeartChart = () => {
  const [activities] = useActivities({
    withCommute: true,
    withPrivate: true,
    sort: 'date',
    sortDirection: 'asc',
    includedActivityTypes: getTypes(ActivityType.Ride),
  });

  const rides = (activities ?? []).filter(
    ({average_heartrate, weighted_average_watts, distance}) =>
      (0 < (average_heartrate ?? 0) || 0 < (weighted_average_watts ?? 0)) && MIN_DISTANCE_METERS < distance
  );

  const heartRateSerie = rides.map(({average_heartrate}) => (average_heartrate ? Math.round(average_heartrate) : null));
  const powerSerie = rides.map(({weighted_average_watts}) =>
    weighted_average_watts ? Math.round(weighted_average_watts) : null
  );
  const labels = rides.map(({start_date}) => new Date(start_date).toLocaleDateString());
  const series = [
    {name: '🫀', data: heartRateSerie},
    {name: '⚡️', data: powerSerie},
  ];

  return <Chart options={getOptions(labels, undefined, options)} series={series} type="line" height={400} />;
};

export {HeartChart};
