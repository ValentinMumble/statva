import {useState} from 'react';
import Chart from 'react-apexcharts';
import {
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  FormControl,
} from '@chakra-ui/react';
import {useActivities} from '../../hooks';
import {eddingtonNumber, getOptions, getRidesBeforeMonth} from '../../models';
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
    includedActivityTypes: [ActivityType.Ride, ActivityType.GravelRide, ActivityType.VirtualRide],
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
    <div>
      <FormControl display="flex" alignItems="center" justifyContent="end" gap={4}>
        <NumberInput width="70px" size="xs" value={itemCount} onChange={(_, value) => setItemCount(value)}>
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
      </FormControl>
      <Chart options={getOptions(labels, undefined, options)} series={series} type="line" height={400} />
    </div>
  );
};

export {EddingtonChart};
