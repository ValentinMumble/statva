import {useState} from 'react';
import Chart from 'react-apexcharts';
import {Group, SegmentGroupValueChangeDetails} from '@chakra-ui/react';
import {SegmentedControl, StepperInput} from '../ui';
import {useActivities, useLabels} from '../../hooks';
import {buildPeriodMap, ChartProps, getOptions, getTypes, labelCollection, Timeframe, TIMEFRAMES} from '../../models';

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

  const dataPerPeriod = buildPeriodMap(activities ?? [], timeframe, data, itemCount);
  const labels = Object.keys(dataPerPeriod).map(key => label(key));
  const series = [{name: label(data), data: Object.values(dataPerPeriod)}];

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
