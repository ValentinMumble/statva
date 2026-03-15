import {useMemo, useState} from 'react';
import {Button, Group, Input, NumberInput, Text} from '@chakra-ui/react';
import {Chart, useChart} from '@chakra-ui/charts';
import {Line, ComposedChart, Tooltip, YAxis, XAxis} from 'recharts';
import {StepperInput} from '../ui';
import {useActivities, useExpenses} from '../../hooks';
import {BikeExpense, formatCurrency, formatDistance, SUPER6} from '../../models';
import {upsertExpense} from '../../api';

const DEFAULT_SKIP_PERCENT = 10;

const CostPerKmChart = () => {
  const [skipPercent, setSkipPercent] = useState<number>(DEFAULT_SKIP_PERCENT);
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState<number>();
  const [description, setDescription] = useState<string>('');
  const {activities} = useActivities({
    withCommute: true,
    withPrivate: true,
    sort: 'date',
    sortDirection: 'asc',
    gearId: SUPER6,
  });
  const {expenses} = useExpenses();

  const canSubmit = undefined !== amount && description.trim() !== '';

  const handleAdd = async () => {
    if (!canSubmit) return;

    const expense: BikeExpense = {
      id: self.crypto.randomUUID(),
      date: new Date(date),
      amount,
      description,
    };

    await upsertExpense(expense);
    setAmount(undefined);
    setDescription('');
  };

  const chartData = useMemo(() => {
    if (!activities || activities.length === 0) {
      return {lineData: [], expenseData: [], lastPoint: undefined, yDomain: [0, 100]};
    }

    let cumulativeDistance = 0;
    const dataPoints: {date: string; costPerKm: number; distance: number; totalCost: number; timestamp: number}[] = [];

    activities.forEach(activity => {
      cumulativeDistance += activity.distance;

      const activityDate = new Date(activity.start_date);
      const totalCost = expenses
        .filter(expense => new Date(expense.date) <= activityDate)
        .reduce((sum, expense) => sum + expense.amount, 0);

      const costPerKm = (totalCost * 100) / (cumulativeDistance / 1000);

      dataPoints.push({
        date: new Date(activity.start_date).toISOString().split('T')[0],
        costPerKm,
        distance: cumulativeDistance,
        totalCost,
        timestamp: new Date(activity.start_date).getTime(),
      });
    });

    // Skip the oldest data points based on skipPercent
    const skipCount = Math.floor((dataPoints.length * skipPercent) / 100);
    const visibleDataPoints = dataPoints.slice(skipCount);

    // Calculate Y domain from visible data
    const costValues = visibleDataPoints.map(d => d.costPerKm);
    const minCost = Math.min(...costValues);
    const maxCost = Math.max(...costValues);
    const padding = (maxCost - minCost) * 0.1;
    const yDomain = [Math.max(0, minCost - padding), maxCost + padding];

    // Calculate expense points for scatter plot
    const firstVisibleDate = visibleDataPoints.length > 0 ? new Date(visibleDataPoints[0].date) : null;
    const positiveExpenses: any[] = [];
    const negativeExpenses: any[] = [];

    expenses
      .filter(expense => firstVisibleDate && new Date(expense.date) >= firstVisibleDate)
      .forEach(expense => {
        const expenseTime = new Date(expense.date).getTime();
        const closestPoint = dataPoints.find(point => point.timestamp >= expenseTime);

        if (closestPoint) {
          const point = {
            timestamp: expenseTime,
            costPerKm: closestPoint.costPerKm,
            description: expense.description,
            amount: expense.amount,
          };

          if (expense.amount > 0) {
            positiveExpenses.push(point);
          } else {
            negativeExpenses.push(point);
          }
        }
      });

    return {
      lineData: visibleDataPoints,
      positiveExpenses,
      negativeExpenses,
      lastPoint: dataPoints[dataPoints.length - 1],
      yDomain,
    };
  }, [activities, expenses, skipPercent]);

  const chart = useChart({
    data: chartData.lineData,
    series: [{name: 'costPerKm', color: 'orange.solid'}],
  });

  if (!activities || activities.length === 0) {
    return <Text>No data available</Text>;
  }

  const {lineData, lastPoint, yDomain} = chartData;

  return (
    <>
      <Group width="full" justifyContent="space-between" gap="20px">
        {lastPoint && (
          <Text fontSize="sm">
            {formatCurrency(lastPoint.costPerKm)}/km • {formatDistance(lastPoint.distance)} total • €
            {lastPoint.totalCost.toLocaleString()} invested ({expenses.length} expenses)
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
      <Chart.Root width="100%" height="400px" chart={chart}>
        <ComposedChart data={lineData}>
          <XAxis
            dataKey="timestamp"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(timestamp) => new Date(timestamp).toLocaleDateString('en-US', {month: 'short', year: '2-digit'})}
          />
          <YAxis domain={yDomain} hide />
          <Tooltip
            content={({payload, active}) => {
              if (!active || !payload?.[0]?.payload) return null;
              const data = payload[0].payload;
              return (
                <div style={{padding: '8px', background: 'rgba(0,0,0,0.8)', color: 'white', borderRadius: '4px'}}>
                  {formatCurrency(data.costPerKm)}/km
                </div>
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="costPerKm"
            stroke="#ca8c19"
            strokeWidth={3}
            dot={false}
            activeDot={{r: 6}}
            isAnimationActive={true}
          />
        </ComposedChart>
      </Chart.Root>
      <Group marginBottom="20px">
        <Input type="date" size="sm" width="220px" value={date} onChange={({target}) => setDate(target.value)} />
        <NumberInput.Root size="sm" value={amount?.toString()} onValueChange={({value}) => setAmount(Number(value))}>
          <NumberInput.Input placeholder="Amount" />
        </NumberInput.Root>
        <Input
          size="sm"
          placeholder="Description"
          value={description}
          onChange={({target}) => setDescription(target.value)}
        />
        <Button size="sm" variant="outline" disabled={!canSubmit} onClick={handleAdd}>
          Add
        </Button>
      </Group>
    </>
  );
};

export {CostPerKmChart};
