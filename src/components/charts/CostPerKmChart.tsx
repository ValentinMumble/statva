import {useMemo, useState} from 'react';
import {Button, Group, IconButton, Input, NumberInput, Stack, Text} from '@chakra-ui/react';
import {LuMinus} from 'react-icons/lu';
import {Bar, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {StepperInput} from '../ui';
import {useActivities, useExpenses} from '../../hooks';
import {getFetcher} from '../../hooks/useFetcher';
import {BikeExpense, formatCurrency, formatDistance, formatDuration, SUPER6} from '../../models';

const upsertExpense = getFetcher<void>('expenses.set');
const deleteExpense = getFetcher<void>('expenses.delete');

const DEFAULT_SKIP_PERCENT = 10;

type DataPoint = {
  month: string;
  timestamp: number;
  costPerKm: number;
  costPerHour: number;
  monthlySpend: number;
  totalCost: number;
  cumulativeDistance: number;
  cumulativeHours: number;
};

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
  const {expenses, refetch} = useExpenses();

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
    await refetch();
  };

  const handleRemove = (expense: BikeExpense) => async () => {
    await deleteExpense(expense.id);
    await refetch();
  };

  const chartData = useMemo(() => {
    if (!activities || activities.length === 0) {
      return {data: [], lastPoint: undefined, yDomain: [0, 100]};
    }

    const sortedExpenses = [...expenses].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    // Build monthly aggregates
    const monthMap = new Map<string, {distance: number; time: number; spend: number}>();

    for (const activity of activities) {
      const d = new Date(activity.start_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const entry = monthMap.get(key) ?? {distance: 0, time: 0, spend: 0};
      entry.distance += activity.distance;
      entry.time += activity.moving_time;
      monthMap.set(key, entry);
    }

    for (const expense of sortedExpenses) {
      const d = new Date(expense.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const entry = monthMap.get(key) ?? {distance: 0, time: 0, spend: 0};
      entry.spend += expense.amount;
      monthMap.set(key, entry);
    }

    // Fill gaps and build cumulative data
    const allKeys = [...monthMap.keys()].sort();
    if (allKeys.length === 0) return {data: [], lastPoint: undefined, yDomain: [0, 100]};

    const [startYear, startMonth] = allKeys[0].split('-').map(Number);
    const endDate = new Date();
    const result: DataPoint[] = [];
    let cumDistance = 0;
    let cumTime = 0;
    let cumCost = 0;

    const current = new Date(startYear, startMonth - 1, 1);
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

    while (current <= end) {
      const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
      const entry = monthMap.get(key);

      cumDistance += entry?.distance ?? 0;
      cumTime += entry?.time ?? 0;
      cumCost += entry?.spend ?? 0;

      const cumKm = cumDistance / 1000;
      const cumHours = cumTime / 3600;

      result.push({
        month: key,
        timestamp: current.getTime(),
        costPerKm: cumKm > 0 ? (cumCost * 100) / cumKm : 0,
        costPerHour: cumHours > 0 ? Math.round((cumCost / cumHours) * 100) / 100 : 0,
        monthlySpend: entry?.spend ?? 0,
        totalCost: Math.round(cumCost),
        cumulativeDistance: cumDistance,
        cumulativeHours: Math.round(cumHours * 10) / 10,
      });

      current.setMonth(current.getMonth() + 1);
    }

    // Skip oldest data points
    const skipCount = Math.floor((result.length * skipPercent) / 100);
    const visible = result.slice(skipCount);

    const costValues = visible.map(d => d.costPerKm);
    const minCost = Math.min(...costValues);
    const maxCost = Math.max(...costValues);
    const padding = (maxCost - minCost) * 0.1;
    const yDomain = [Math.max(0, minCost - padding), maxCost + padding];

    return {
      data: visible,
      lastPoint: result[result.length - 1],
      yDomain,
    };
  }, [activities, expenses, skipPercent]);

  if (!activities || activities.length === 0) {
    return <Text>No data available</Text>;
  }

  const {data, lastPoint, yDomain} = chartData;

  return (
    <>
      <Group width="full" justifyContent="space-between" gap="20px">
        {lastPoint && (
          <Text fontSize="sm">
            {formatCurrency(lastPoint.costPerKm)}/km • {formatCurrency(lastPoint.costPerHour * 100)}/h •{' '}
            {formatDistance(lastPoint.cumulativeDistance)} • €{lastPoint.totalCost.toLocaleString()} invested •{' '}
            {formatDuration(lastPoint.cumulativeHours * 3600, true)} ({expenses.length} expenses)
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
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={data}>
          <XAxis
            dataKey="timestamp"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={ts => new Date(ts).toLocaleDateString('en-US', {month: 'short', year: '2-digit'})}
          />
          <YAxis yAxisId="costPerKm" domain={yDomain} hide />
          <YAxis yAxisId="costPerHour" hide />
          <YAxis yAxisId="spend" orientation="right" hide />
          <Tooltip
            content={({payload, active}) => {
              if (!active || !payload?.[0]?.payload) return null;
              const d = payload[0].payload as DataPoint;
              return (
                <div style={{padding: '8px', background: 'rgba(0,0,0,0.85)', color: 'white', borderRadius: '4px', fontSize: '12px'}}>
                  <div style={{marginBottom: '4px'}}>{d.month}</div>
                  <div style={{color: '#ca8c19'}}>{formatCurrency(d.costPerKm)}/km</div>
                  <div style={{color: '#ED9564'}}>{formatCurrency(d.costPerHour * 100)}/h</div>
                  {d.monthlySpend > 0 && <div style={{color: '#6495ED'}}>Monthly: €{d.monthlySpend}</div>}
                  <div>Total: €{d.totalCost} • {d.cumulativeHours}h</div>
                </div>
              );
            }}
          />
          <Bar dataKey="monthlySpend" yAxisId="spend" fill="#6495ED30" radius={[2, 2, 0, 0]} />
          <Line type="monotone" dataKey="costPerKm" yAxisId="costPerKm" stroke="#ca8c19" strokeWidth={2.5} dot={false} activeDot={{r: 5}} />
          <Line type="monotone" dataKey="costPerHour" yAxisId="costPerHour" stroke="#ED9564" strokeWidth={2} dot={false} strokeDasharray="4 2" />
        </ComposedChart>
      </ResponsiveContainer>
      <Group marginBottom="20px" onKeyDown={({key}) => key === 'Enter' && handleAdd()}>
        <Input type="date" size="sm" width="220px" value={date} onChange={({target}) => setDate(target.value)} />
        <NumberInput.Root
          size="sm"
          value={amount?.toString() ?? ''}
          onValueChange={({value}) => setAmount('' === value ? undefined : Number(value))}
        >
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
      {expenses.length > 0 && (
        <Stack gap="0" maxHeight="240px" overflowY="auto" marginBottom="20px">
          {[...expenses]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map(expense => (
              <Group
                key={expense.id}
                justifyContent="space-between"
                paddingY="6px"
                gap="10px"
                borderBottomWidth="1px"
                borderColor="gray.700"
              >
                <Text fontSize="xs" color="gray.400" width="90px" flexShrink={0}>
                  {new Date(expense.date).toLocaleDateString('en-US', {day: 'numeric', month: 'short', year: '2-digit'})}
                </Text>
                <Text fontSize="sm" flex="1" truncate>
                  {expense.description}
                </Text>
                <Text
                  fontSize="sm"
                  color={expense.amount >= 0 ? 'orange.solid' : 'green.solid'}
                  fontWeight="medium"
                  flexShrink={0}
                >
                  {formatCurrency(expense.amount * 100)}
                </Text>
                <IconButton variant="ghost" title="Remove expense" size="xs" flexShrink={0} onClick={handleRemove(expense)}>
                  <LuMinus />
                </IconButton>
              </Group>
            ))}
        </Stack>
      )}
    </>
  );
};

export {CostPerKmChart};
