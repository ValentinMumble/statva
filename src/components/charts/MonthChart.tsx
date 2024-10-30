import {useState} from 'react';
import Chart from 'react-apexcharts';
import {createListCollection, Group, SelectValueChangeDetails} from '@chakra-ui/react';
import {
  NumberInputField,
  NumberInputRoot,
  Radio,
  RadioGroup,
  SelectContent,
  SelectItem,
  SelectRoot,
  SelectTrigger,
  SelectValueText,
} from '../ui';
import {useActivities, useLabels} from '../../hooks';
import {ChartProps, generatePeriodKeys, getOptions, getTypes, getWeekNumber} from '../../models';
import {ActivityType} from '../../models/strava';

const INITIAL_MONTH_COUNT = 15;
const INITIAL_WEEK_COUNT = 26;
const TYPES = ['Ride', 'Run', 'Swim', 'Tennis'];

type MonthChartProps = ChartProps & {
  timeframe?: string;
};

const MonthChart = ({
  data,
  dataLabel,
  formatter,
  filter,
  timeframe: initialTimeframe = 'month',
  ...rest
}: MonthChartProps) => {
  const [timeframe, setTimeframe] = useState<string>(initialTimeframe);
  const [types, setTypes] = useState<string[]>([TYPES[0]]);
  const [itemCount, setItemCount] = useState<number>(
    'month' === initialTimeframe ? INITIAL_MONTH_COUNT : INITIAL_WEEK_COUNT
  );
  const [activities] = useActivities({
    withCommute: true,
    withPrivate: true,
    sort: 'date',
    sortDirection: 'asc',
    includedActivityTypes: getTypes(types[0] as ActivityType),
    ...filter,
  });
  const [label] = useLabels();

  const handleTypeChange = ({value}: SelectValueChangeDetails) => setTypes(value);
  const handleTimeframeChange = (newTimeframe: string) => {
    setTimeframe(newTimeframe);
    setItemCount('month' === newTimeframe ? INITIAL_MONTH_COUNT : INITIAL_WEEK_COUNT);
  };

  const dataPerPeriod = (activities ?? []).reduce((periodMap: {[period: string]: number}, activity) => {
    const date = new Date(activity.start_date);
    const period =
      'week' === timeframe
        ? `${getWeekNumber(date)}/${date.getUTCFullYear()}`
        : `${date.getUTCMonth() + 1}/${date.getUTCFullYear()}`;
    periodMap[period] = (periodMap[period] ?? 0) + (typeof data === 'number' ? data : (activity[data] as number));

    return periodMap;
  }, generatePeriodKeys(new Date((activities ?? []).at(0)?.start_date ?? 0), new Date((activities ?? []).at(-1)?.start_date ?? 0), timeframe));

  const sliced = Object.fromEntries(Object.entries(dataPerPeriod).slice(-itemCount));
  const labels = 'week' === timeframe ? Object.keys(sliced).map(label) : Object.keys(sliced);
  const series = [{name: dataLabel, data: Object.values(sliced)}];

  const typeCollection = createListCollection({
    items: TYPES.map(type => ({value: type, label: label(type)})),
  });

  return (
    <>
      <Group width="full" justifyContent="end">
        <SelectRoot width="70px" collection={typeCollection} value={types} onValueChange={handleTypeChange}>
          <SelectTrigger>
            <SelectValueText />
          </SelectTrigger>
          <SelectContent>
            {typeCollection.items.map(type => (
              <SelectItem item={type} key={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </SelectRoot>
        <RadioGroup value={timeframe} display="flex" gap={4} onValueChange={e => handleTimeframeChange(e.value)}>
          <Radio value="month">Month</Radio>
          <Radio value="week">Week</Radio>
        </RadioGroup>
        <NumberInputRoot
          width="70px"
          size="xs"
          value={itemCount.toString()}
          onValueChange={details => setItemCount(details.valueAsNumber)}
        >
          <NumberInputField />
        </NumberInputRoot>
      </Group>
      <Chart options={getOptions(labels, formatter)} series={series} type="bar" height={400} {...rest} />
    </>
  );
};

export {MonthChart};
