import {useState} from 'react';
import {Group} from '@chakra-ui/react';
import Chart from 'react-apexcharts';
import {YearRangeSlider} from '../../components';
import {useActivities} from '../../hooks';
import {formatPower, formatSpeed, getOptions, range} from '../../models';

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
  const [yearRange, setYearRange] = useState<number[]>([]);
  const [activities] = useActivities({
    search,
    withCommute: false,
    withPrivate: false,
    sort: 'date',
    sortDirection: 'asc',
    years: 0 === yearRange.length ? undefined : range(yearRange[0], yearRange[1]),
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
    {name: '🏁', data: averageSpeedSerie},
    {name: '⚡️', data: averagePowerSerie as number[][]},
  ];

  return (
    <>
      <Group padding="0 30px" width="full">
        <YearRangeSlider value={yearRange} min={2023} onChange={setYearRange} />
      </Group>
      <Chart options={getOptions([], undefined, options)} series={series} type="line" height={400} />
    </>
  );
};

export {ProgressChart};
