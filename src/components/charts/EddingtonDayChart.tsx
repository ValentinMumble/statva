import {useState} from 'react';
import Chart from 'react-apexcharts';
import {Group} from '@chakra-ui/react';
import {StepperInput} from '../../components/ui';
import {useActivities} from '../../hooks';
import {getOptions, getTypes, daysExceedingDistance, eddingtonNumber} from '../../models';
import {ActivityType} from '../../models/strava';

const MAX_DISTANCE = 100;

const EddingtonDayChart = () => {
  const [itemCount, setItemCount] = useState<number>(MAX_DISTANCE);
  const [activities] = useActivities({
    withCommute: true,
    withPrivate: true,
    sort: 'date',
    sortDirection: 'asc',
    includedActivityTypes: getTypes(ActivityType.Ride),
  });

  const [eddington] = eddingtonNumber(activities ?? []);
  const ridesByDistance = daysExceedingDistance(activities ?? []);
  const series = [{name: '🧸', data: Object.values(ridesByDistance).slice(0, itemCount)}];

  return (
    <>
      <Group width="full" justifyContent="end" gap="20px">
        <StepperInput
          size="xs"
          value={itemCount.toString()}
          onValueChange={({valueAsNumber}) => setItemCount(valueAsNumber)}
        />
      </Group>
      <Chart
        options={getOptions([], undefined, {
          dataLabels: {
            enabled: true,
            offsetY: -25,
            formatter: (_, {dataPointIndex}) => (eddington === dataPointIndex ? eddington : ''),
          },
          plotOptions: {
            bar: {
              dataLabels: {position: 'top'},
            },
          },
        })}
        series={series}
        type="bar"
        height={400}
      />
    </>
  );
};

export {EddingtonDayChart};
