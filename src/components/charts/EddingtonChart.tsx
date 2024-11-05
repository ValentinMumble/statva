import {useState} from 'react';
import Chart from 'react-apexcharts';
import {Group} from '@chakra-ui/react';
import {StepperInput} from '../../components/ui';
import {useActivities} from '../../hooks';
import {eddingtonNumber, getOptions, getRidesBeforeMonth, getTypes} from '../../models';
import {ActivityType} from '../../models/strava';

const DEFAULT_ITEM_COUNT = 18;

const options: ApexCharts.ApexOptions = {
  colors: ['#ca8c19'],
  stroke: {
    curve: 'smooth',
    width: 4,
  },
  yaxis: {min: 10},
  fill: {type: 'gradient'},
};

type EddingtonChartProps = {};

const EddingtonChart = ({}: EddingtonChartProps) => {
  const [itemCount, setItemCount] = useState<number>(DEFAULT_ITEM_COUNT);
  const [activities] = useActivities({
    withCommute: true,
    withPrivate: true,
    sort: 'date',
    sortDirection: 'asc',
    includedActivityTypes: getTypes(ActivityType.Ride),
  });

  const dataPerMonth = (activities ?? []).reduce((eddingtonByMonth: {[monthYear: string]: number}, activity) => {
    const date = new Date(activity.start_date);
    const monthYear = `${date.getUTCMonth() + 1}/${date.getUTCFullYear()}`;
    eddingtonByMonth[monthYear] = eddingtonNumber(getRidesBeforeMonth(activities ?? [], date))[0];

    return eddingtonByMonth;
  }, {});

  const sliced = Object.fromEntries(Object.entries(dataPerMonth).slice(-itemCount));
  const labels = Object.keys(sliced);
  const series = [{name: '🧸', data: Object.values(sliced)}];

  return (
    <>
      <Group width="full" justifyContent="end" gap="20px">
        <StepperInput
          size="xs"
          value={itemCount.toString()}
          onValueChange={({valueAsNumber}) => setItemCount(valueAsNumber)}
        />
      </Group>
      <Chart options={getOptions(labels, undefined, options)} series={series} type="line" height={400} />
    </>
  );
};

export {EddingtonChart};
