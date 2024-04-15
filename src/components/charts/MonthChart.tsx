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
import {ChartProps, generatePeriodKeys, getOptions, getWeekLabel, getWeekNumber} from '../../models';

const INITIAL_MONTH_COUNT = 15;
const INITIAL_WEEK_COUNT = 26;

const MonthChart = ({
  data,
  dataLabel,
  formatter,
  filter,
  timeframe: initialTimeframe = 'month',
  ...rest
}: ChartProps & {timeframe?: 'month' | 'week'}) => {
  const [timeframe, setTimeframe] = useState<'month' | 'week'>(initialTimeframe);
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

  const handleTimeframeChange = (newTimeframe: 'month' | 'week') => {
    setTimeframe(newTimeframe);
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
  }, generatePeriodKeys(new Date(activities.at(0)?.start_date ?? 0), new Date(activities.at(-1)?.start_date ?? 0), timeframe));

  const sliced = Object.fromEntries(Object.entries(dataPerPeriod).slice(-itemCount));
  const labels = 'week' === timeframe ? Object.keys(sliced).map(getWeekLabel) : Object.keys(sliced);
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
