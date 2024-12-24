import {useState} from 'react';
import {Group} from '@chakra-ui/react';
import Chart from 'react-apexcharts';
import {YearRangeSlider} from '../../components';
import {useActivities} from '../../hooks';
import {ActivityType} from '../../models/strava';
import {getOptions, getTypes, range} from '../../models';

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
  xaxis: {type: 'datetime'},
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
  const [yearRange, setYearRange] = useState<number[]>([]);
  const [activities] = useActivities({
    withCommute: true,
    withPrivate: true,
    sort: 'date',
    sortDirection: 'asc',
    includedActivityTypes: getTypes(ActivityType.Ride),
    years: 0 === yearRange.length ? undefined : range(yearRange[0], yearRange[1]),
  });

  const rides = (activities ?? []).filter(
    ({average_heartrate, weighted_average_watts, distance}) =>
      (0 < (average_heartrate ?? 0) || 0 < (weighted_average_watts ?? 0)) && MIN_DISTANCE_METERS < distance
  );

  const heartRateSerie = rides.map(({average_heartrate, start_date}) => [
    new Date(start_date).getTime(),
    average_heartrate ? Math.round(average_heartrate) : null,
  ]);
  const powerSerie = rides.map(({weighted_average_watts, start_date}) => [
    new Date(start_date).getTime(),
    weighted_average_watts ? Math.round(weighted_average_watts) : null,
  ]);
  const series = [
    {name: '🫀', data: heartRateSerie as number[][]},
    {name: '⚡️', data: powerSerie as number[][]},
  ];

  return (
    <>
      <Group padding="0 30px" width="full">
        <YearRangeSlider value={yearRange} min={2023} onChange={setYearRange} />
      </Group>
      <Chart options={getOptions([], undefined, options)} series={series} type="line" height={400} />
    </>
  );
};

export {HeartChart};
