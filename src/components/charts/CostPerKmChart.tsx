import {useMemo, useState} from 'react';
import Chart from 'react-apexcharts';
import {Group, Text} from '@chakra-ui/react';
import {StepperInput} from '../ui';
import {useActivities} from '../../hooks';
import {formatCurrency, formatDistance, getOptions, SUPER6} from '../../models';

const DEFAULT_SKIP_PERCENT = 10;

type BikeExpense = {
  date: Date;
  amount: number;
  description?: string;
};

const BIKE_EXPENSES: BikeExpense[] = [
  {date: new Date('2023-10-27'), amount: 5960.63, description: 'Cannondale SuperSix Carbon 1'},
  {date: new Date('2023-11-29'), amount: 266.78, description: 'SRAM Force Power Meter'},
  {date: new Date('2024-12-15'), amount: 281.34, description: 'S-Works Romin EVO Mirror'},
  {date: new Date('2025-05-25'), amount: 293.54, description: 'Roval Rapide 31.8'},
  {date: new Date('2025-06-18'), amount: 140, description: 'Wahoo Speedplay Comp Ti'},
  {date: new Date('2025-07-09'), amount: -65, description: 'Sold broken Vision Trimax Carbon'},
].sort((a, b) => a.date.getTime() - b.date.getTime());

const CostPerKmChart = () => {
  const [skipPercent, setSkipPercent] = useState<number>(DEFAULT_SKIP_PERCENT);
  const [activities] = useActivities({
    withCommute: true,
    withPrivate: true,
    sort: 'date',
    sortDirection: 'asc',
    gearId: SUPER6,
  });

  const chartData = useMemo(() => {
    if (!activities || activities.length === 0) {
      return {labels: [], series: []};
    }

    let cumulativeDistance = 0;
    const dataPoints: {date: string; costPerKm: number; distance: number; totalCost: number}[] = [];

    activities.forEach(activity => {
      cumulativeDistance += activity.distance;

      const activityDate = new Date(activity.start_date);
      const totalCost = BIKE_EXPENSES.filter(expense => new Date(expense.date) <= activityDate).reduce(
        (sum, expense) => sum + expense.amount,
        0
      );

      const costPerKm = (totalCost * 100) / (cumulativeDistance / 1000);

      dataPoints.push({
        date: new Date(activity.start_date).toISOString().split('T')[0],
        costPerKm,
        distance: cumulativeDistance,
        totalCost,
      });
    });

    // Skip the oldest data points based on skipPercent
    const skipCount = Math.floor((dataPoints.length * skipPercent) / 100);
    const visibleDataPoints = dataPoints.slice(skipCount);

    const labels = visibleDataPoints.map(({date}) => date);
    const series = [
      {
        name: 'Cost per km',
        data: visibleDataPoints.map(({costPerKm}) => costPerKm),
      },
    ];

    return {labels, series, lastPoint: dataPoints[dataPoints.length - 1]};
  }, [activities, skipPercent]);

  if (!activities || activities.length === 0) {
    return <Text>No data available</Text>;
  }

  const {labels, series, lastPoint} = chartData;

  return (
    <>
      <Group width="full" justifyContent="space-between" gap="20px">
        {lastPoint && (
          <Text fontSize="sm">
            {formatCurrency(lastPoint.costPerKm)}/km • {formatDistance(lastPoint.distance)} total • €
            {lastPoint.totalCost.toLocaleString()} invested
          </Text>
        )}
        <Group gap="10px" alignItems="center">
          <Text fontSize="xs" color="gray.400">
            Skip oldest %:
          </Text>
          <StepperInput
            size="xs"
            min={0}
            max={90}
            step={5}
            value={skipPercent.toString()}
            onValueChange={({valueAsNumber}) => setSkipPercent(valueAsNumber)}
          />
        </Group>
      </Group>
      <Chart
        options={getOptions(labels, undefined, {
          yaxis: {
            logarithmic: true,
            logBase: 20,
            labels: {
              formatter: (value: number) => formatCurrency(value),
            },
            min: 0,
          },
          xaxis: {
            type: 'datetime',
            labels: {
              datetimeUTC: false,
            },
          },
          colors: ['#ca8c19'],
          fill: {
            type: 'solid',
          },
          stroke: {
            curve: 'straight',
            width: 3,
          },
          markers: {size: [0]},
        })}
        series={series}
        type="line"
        height={400}
      />
    </>
  );
};

export {CostPerKmChart};
