import {useState} from 'react';
import {Group} from '@chakra-ui/react';
import Chart from 'react-apexcharts';
import {StepperInput} from '../../components/ui';
import {useActivities} from '../../hooks';
import {formatPower, formatSpeed, getOptions} from '../../models';

const DEFAULT_ITEM_COUNT = 50;

const options: ApexCharts.ApexOptions = {
  xaxis: {type: 'datetime'},
  yaxis: [
    {
      labels: {formatter: (value: number) => formatSpeed(value)},
      min: 22 / 3.6,
      max: 40 / 3.6,
    },
    {
      opposite: true,
      labels: {formatter: formatPower},
      min: 120,
      max: 260,
    },
  ],
  colors: ['#aba19c', '#e09200'],
  stroke: {curve: 'smooth'},
  fill: {type: 'gradient'},
};

type ProgressChartProps = {
  search: string;
};

const ProgressChart = ({search}: ProgressChartProps) => {
  const [itemCount, setItemCount] = useState<number>(DEFAULT_ITEM_COUNT);
  const {activities} = useActivities({
    search,
    withCommute: false,
    withPrivate: false,
    sort: 'date',
    sortDirection: 'asc',
  });

  const averageSpeedSerie = (activities ?? []).map(({average_speed, start_date}) => [
    new Date(start_date).getTime(),
    average_speed,
  ]);
  const averagePowerSerie = (activities ?? []).map(({weighted_average_watts, start_date}) => [
    new Date(start_date).getTime(),
    weighted_average_watts ?? null,
  ]);
  const series = [
    {name: '🏁', data: averageSpeedSerie.slice(-itemCount)},
    {name: '⚡️', data: averagePowerSerie.slice(-itemCount) as number[][]},
  ];

  return (
    <>
      <Group width="full" justifyContent="end" gap="20px">
        <StepperInput
          size="xs"
          value={itemCount.toString()}
          onValueChange={({valueAsNumber}) => setItemCount(valueAsNumber)}
        />
      </Group>
      <Chart options={getOptions([], undefined, options)} series={series} type="line" height={400} />
    </>
  );
};

export {ProgressChart};
