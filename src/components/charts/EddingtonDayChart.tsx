import {useState} from 'react';
import Chart from 'react-apexcharts';
import {Group} from '@chakra-ui/react';
import {Slider} from '../../components/ui';
import {useActivities} from '../../hooks';
import {getOptions, getTypes, daysExceedingDistance, eddingtonNumber, range} from '../../models';
import {ActivityType} from '../../models/strava';

const BOUNDARIES = [0, 250];
const INITIAL_RANGE = [10, 120];

const EddingtonDayChart = () => {
  const [distanceRange, setDistanceRange] = useState<number[]>(INITIAL_RANGE);
  const {activities} = useActivities({
    withCommute: true,
    withPrivate: true,
    sort: 'date',
    sortDirection: 'asc',
    includedActivityTypes: getTypes(ActivityType.Ride),
  });

  const [eddington] = eddingtonNumber(activities ?? []);
  const ridesByDistance = daysExceedingDistance(activities ?? []);
  const sliced = Object.fromEntries(
    Object.entries(ridesByDistance).filter(
      ([distance]) => Number(distance) >= distanceRange[0] && Number(distance) <= distanceRange[1]
    )
  );
  const series = [{name: '🧸', data: Object.values(sliced)}];

  return (
    <>
      <Group width="full" justifyContent="center">
        <Slider
          width="90%"
          size="sm"
          value={distanceRange}
          onValueChangeEnd={({value}) => setDistanceRange(value)}
          min={BOUNDARIES[0]}
          max={BOUNDARIES[1]}
          marks={range(BOUNDARIES[0], BOUNDARIES[1], Math.round(BOUNDARIES[1] / 5)).map(value => ({
            label: value,
            value,
          }))}
        />
      </Group>
      <Chart
        options={getOptions(Object.keys(sliced), undefined, {
          xaxis: {
            tickAmount: 5,
          },
          dataLabels: {
            enabled: true,
            offsetY: -25,
            formatter: (_value, {dataPointIndex}) => (eddington === dataPointIndex + distanceRange[0] ? eddington : []),
          },
          colors: [
            ({dataPointIndex}: {dataPointIndex: number}) =>
              eddington === dataPointIndex + distanceRange[0] ? '#e07000' : '#e0700070',
          ],
          plotOptions: {
            bar: {
              dataLabels: {position: 'top'},
            },
          },
          stroke: {width: 0},
        })}
        series={series}
        type="bar"
        height={400}
      />
    </>
  );
};

export {EddingtonDayChart};
