import {useState} from 'react';
import Chart from 'react-apexcharts';
import {Group, SegmentGroupValueChangeDetails} from '@chakra-ui/react';
import {SegmentedControl, StepperInput} from '../ui';
import {useActivities, useLabels} from '../../hooks';
import {
  ChartProps,
  generatePeriodKeys,
  getOptions,
  getTypes,
  labelCollection,
  Timeframe,
  TIMEFRAMES,
} from '../../models';

const TYPES = ['Ride', 'Run', 'Swim', 'Tennis'];

type MonthChartProps = ChartProps & {
  timeframe?: Timeframe;
};

const MonthChart = ({data, formatter, filter, timeframe: initialTimeframe = 'month', ...rest}: MonthChartProps) => {
  const [timeframe, setTimeframe] = useState<Timeframe>(initialTimeframe);
  const [type, setType] = useState<string>(TYPES[0]);
  const [itemCount, setItemCount] = useState<number>(TIMEFRAMES[initialTimeframe].initialItemCount);
  const [activities] = useActivities({
    withCommute: true,
    withPrivate: true,
    sort: 'date',
    sortDirection: 'asc',
    includedActivityTypes: getTypes(type),
    ...filter,
  });
  const [label] = useLabels();

  const handleTypeChange = ({value}: SegmentGroupValueChangeDetails) => setType(value);
  const handleTimeframeChange = (newTimeframe: Timeframe) => {
    setTimeframe(newTimeframe);
    setItemCount(TIMEFRAMES[newTimeframe].initialItemCount);
  };

  const dataPerPeriod = (activities ?? []).reduce((periodMap: {[period: string]: number}, activity) => {
    const date = new Date(activity.start_date);
    const periodKey = TIMEFRAMES[timeframe].getPeriodKey(date);
    periodMap[periodKey] = (periodMap[periodKey] ?? 0) + (activity[data] as number);

    return periodMap;
  }, generatePeriodKeys(new Date((activities ?? []).at(0)?.start_date ?? 0), new Date((activities ?? []).at(-1)?.start_date ?? 0), timeframe));

  const sliced = Object.fromEntries(Object.entries(dataPerPeriod).slice(-itemCount));
  const labels = Object.keys(sliced).map(key => label(key));
  const series = [{name: label(data), data: Object.values(sliced)}];

  return (
    <>
      <Group width="full" justifyContent="end" gap="20px">
        <SegmentedControl
          value={type}
          size="sm"
          onValueChange={handleTypeChange}
          items={labelCollection(TYPES, label).items}
        />
        <SegmentedControl
          value={timeframe}
          size="sm"
          onValueChange={({value}) => handleTimeframeChange(value as Timeframe)}
          items={labelCollection(Object.keys(TIMEFRAMES), label).items}
        />
        <StepperInput
          size="xs"
          value={itemCount.toString()}
          onValueChange={({valueAsNumber}) => setItemCount(valueAsNumber)}
        />
      </Group>
      <Chart options={getOptions(labels, formatter)} series={series} type="bar" height={400} {...rest} />
    </>
  );
};

export {MonthChart};
