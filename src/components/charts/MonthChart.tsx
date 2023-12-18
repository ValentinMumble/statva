import {useState} from 'react';
import Chart from 'react-apexcharts';
import {
  FormControl,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Radio,
  RadioGroup,
} from '@chakra-ui/react';
import {useActivities} from '../../hooks';
import {ChartProps, getOptions, getWeekNumber} from '../../models';
import {DetailedActivity} from '../../models/strava';

const INITIAL_MONTH_COUNT = 12;
const INITIAL_WEEK_COUNT = 26;

type Timeframe = 'month' | 'week';

const generatePeriodKeys = (activities: DetailedActivity[], timeframe: Timeframe) => {
  const firstDate = new Date(activities.at(0)?.start_date ?? 0);
  const lastDate = new Date(activities.at(-1)?.start_date ?? 0);
  const emptyValues: {[period: string]: number} = {};

  for (let year = firstDate.getFullYear(); year <= lastDate.getFullYear(); year++) {
    let maxPeriod = 'month' === timeframe ? 12 : 52;
    maxPeriod =
      year === lastDate.getUTCFullYear()
        ? Math.min('month' === timeframe ? lastDate.getUTCMonth() + 1 : getWeekNumber(lastDate), maxPeriod)
        : maxPeriod;

    for (let period = 1; period <= maxPeriod; period++) {
      emptyValues[`${period}/${year}`] = 0;
    }
  }

  return emptyValues;
};

const MonthChart = ({
  data,
  dataLabel,
  formatter,
  filter,
  timeframe: initialTimeframe = 'month',
  ...rest
}: ChartProps & {timeframe?: Timeframe}) => {
  const [timeframe, setTimeframe] = useState<Timeframe>(initialTimeframe);
  const [itemCount, setItemCount] = useState<number>(
    'month' === initialTimeframe ? INITIAL_MONTH_COUNT : INITIAL_WEEK_COUNT
  );
  const [activities] = useActivities({
    withCommute: true,
    withPrivate: true,
    sort: 'date',
    sortDirection: 'asc',
    ...filter,
  });

  const handleTimeframeChange = (newTimeframe: string) => {
    setTimeframe(newTimeframe as Timeframe);
    setItemCount('month' === newTimeframe ? INITIAL_MONTH_COUNT : INITIAL_WEEK_COUNT);
  };

  const dataPerPeriod = activities.reduce((periodMap: {[period: string]: number}, activity) => {
    const date = new Date(activity.start_date);
    const period =
      'week' === timeframe
        ? `${getWeekNumber(date)}/${date.getUTCFullYear()}`
        : `${date.getUTCMonth() + 1}/${date.getUTCFullYear()}`;
    periodMap[period] = (periodMap[period] ?? 0) + (activity[data] as number);

    return periodMap;
  }, generatePeriodKeys(activities, timeframe));

  const sliced = Object.fromEntries(Object.entries(dataPerPeriod).slice(-itemCount));
  const labels = Object.keys(sliced);
  const series = [{name: dataLabel, data: Object.values(sliced)}];

  return (
    <div>
      <FormControl display="flex" alignItems="center" justifyContent="end" gap={4}>
        <RadioGroup value={timeframe} display="flex" gap={4} onChange={handleTimeframeChange}>
          <Radio value="month">Month</Radio>
          <Radio value="week">Week</Radio>
        </RadioGroup>
        <NumberInput width="70px" size="xs" value={itemCount} onChange={(_, value) => setItemCount(value)}>
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
      </FormControl>
      <Chart options={getOptions(labels, formatter)} series={series} type="bar" height={400} {...rest} />
    </div>
  );
};

export {MonthChart};
