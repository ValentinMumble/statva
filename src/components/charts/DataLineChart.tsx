import {useState} from 'react';
import Chart from 'react-apexcharts';
import {Group} from '@chakra-ui/react';
import {StepperInput} from '../ui';
import {useActivities, useLabels} from '../../hooks';
import {ChartProps, extractEmoji, getOptions} from '../../models';

const DEFAULT_ITEM_COUNT = 50;

const options: ApexCharts.ApexOptions = {
  colors: ['#645f28'],
  fill: {
    type: 'gradient',
    gradient: {
      type: 'vertical',
      gradientToColors: ['#da340a'],
    },
  },
  stroke: {
    curve: 'smooth',
    width: 3,
  },
  markers: {size: [0]},
};

const DataLineChart = ({data}: ChartProps) => {
  const [itemCount, setItemCount] = useState<number>(DEFAULT_ITEM_COUNT);
  const [label] = useLabels();
  const [activities] = useActivities({
    withCommute: false,
    withPrivate: false,
    sort: 'date',
    sortDirection: 'asc',
  });

  if ('number' === typeof data) {
    return null;
  }

  const relevantActivities = (activities ?? []).filter(activity => undefined !== activity[data]).slice(-itemCount);
  const labels = relevantActivities.map(({name}) => extractEmoji(name));
  const series = [{name: label(data), data: relevantActivities.map(activity => Number(activity[data] ?? 0))}];

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

export {DataLineChart};
