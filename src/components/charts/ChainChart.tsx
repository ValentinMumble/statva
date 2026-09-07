import {useState} from 'react';
import {Group, SegmentGroupValueChangeDetails, Spacer, Span, Text} from '@chakra-ui/react';
import {Chart, useChart} from '@chakra-ui/charts';
import {Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {SegmentedControl, Switch} from '../../components/ui';
import {EditEvents, EditLabels} from '../../components';
import {ChainEvent, formatDistance, getPeriodColor, getRidesBetween, labelCollection, SUPER6} from '../../models';
import {useActivities, useEvents, useLabels} from '../../hooks';
import {ChartTooltip} from './ChartTooltip';

// A chain gets rotated off the bike once it has done this much on its current stint.
const ROTATION_LIMIT = 400 * 1000;
const RETIRED_CHAINS = ['🍍', '🧄', '🍪', '🍌', '🍋'];
const RETIRED_BIKES = ['b11897955', 'b12655849'];

const getTotal = (distances: number[]): number => distances.reduce((total, current) => total + current, 0);

const getRowColor = (isCurrent: boolean, isSuggested: boolean): string =>
  isCurrent ? 'orange.solid' : isSuggested ? 'green.solid' : 'fg.muted';

const ChainChart = () => {
  const [withRetired, setWithRetired] = useState<boolean>(false);
  const [gearId, setGearId] = useState<string>(SUPER6);
  const {label} = useLabels();
  const {events: chainEvents, refetch: refreshEvents} = useEvents<ChainEvent>('chain');

  const {activities} = useActivities({
    withCommute: true,
    withPrivate: true,
    sort: 'date',
    sortDirection: 'asc',
    gearId,
  });

  const handleGearChange = ({value}: SegmentGroupValueChangeDetails) => value && setGearId(value);

  const currentBikeEvents = chainEvents.filter(({bike}) => gearId === bike);

  const chainOdometer = currentBikeEvents.reduce((chainOdometer: Record<string, number[]>, event, index) => {
    const nextEventDate = currentBikeEvents[index + 1]?.date;
    const periodDistance = getRidesBetween(activities ?? [], event.date, nextEventDate).reduce(
      (sum, ride) => ride.distance + sum,
      0
    );

    chainOdometer[event.chain] = [...(chainOdometer[event.chain] ?? []), periodDistance];

    return chainOdometer;
  }, {});

  const displayedChains = Object.keys(chainOdometer)
    .filter(chain => withRetired || !RETIRED_CHAINS.includes(chain))
    .sort((chainA, chainB) => getTotal(chainOdometer[chainB]) - getTotal(chainOdometer[chainA]));

  const currentChain = currentBikeEvents.at(-1)?.chain ?? '';
  const currentRotation = chainOdometer[currentChain]?.at(-1) ?? 0;
  const isDue = ROTATION_LIMIT <= currentRotation;

  // Swap in the least used chain, so the whole set wears down together.
  const [suggestedChain] = Object.keys(chainOdometer)
    .filter(chain => chain !== currentChain && !RETIRED_CHAINS.includes(chain))
    .sort((chainA, chainB) => getTotal(chainOdometer[chainA]) - getTotal(chainOdometer[chainB]));

  const retiredTotals = RETIRED_CHAINS.filter(chain => chain in chainOdometer).map(chain =>
    getTotal(chainOdometer[chain])
  );
  const wearLimit =
    0 === retiredTotals.length ? null : retiredTotals.reduce((total, current) => total + current, 0) / retiredTotals.length;

  const maxPeriods = displayedChains.reduce((max, chain) => Math.max(max, chainOdometer[chain].length), 0);
  const periodKeys = [...Array(maxPeriods).keys()].map(index => `period${index}`);

  const rows = displayedChains.map(chain => {
    const distances = chainOdometer[chain];
    const total = getTotal(distances);
    const row: Record<string, number | string | boolean> = {
      label: `${chain} ${formatDistance(total)}`,
      avgLabel: `${formatDistance(total / distances.length)} avg`,
      chain,
      isCurrent: chain === currentChain,
      isSuggested: chain === suggestedChain,
    };

    distances.forEach((distance, index) => (row[`period${index}`] = distance));

    return row;
  });

  const currentRowLabel = rows.find(({isCurrent}) => isCurrent)?.label;
  const suggestedRowLabel = rows.find(({isSuggested}) => isSuggested)?.label;

  const chart = useChart({
    data: rows,
    series: periodKeys.map((name, index) => ({name, color: getPeriodColor(index)})),
  });

  const relevantBikes = [...new Set(chainEvents.map(({bike}) => bike))].filter(
    bike => withRetired || !RETIRED_BIKES.includes(bike)
  );
  const bikeCollection = labelCollection(relevantBikes, key => label(key, true));

  const avg =
    0 === displayedChains.length
      ? 0
      : displayedChains.map(chain => getTotal(chainOdometer[chain])).reduce((total, current) => total + current, 0) /
        displayedChains.length;

  return (
    <>
      <Group width="full" justifyContent="end" gap="12px">
        <Switch size="xs" checked={withRetired} onCheckedChange={({checked}) => setWithRetired(checked)}>
          🗄️
        </Switch>
        <Spacer />
        <Text fontSize="sm" whiteSpace="nowrap" color={isDue ? 'red.solid' : undefined}>
          <Span fontStyle="italic">rotation</Span> {currentChain} {formatDistance(currentRotation)}
          {isDue ? (
            ' · due'
          ) : (
            <Span color="fg.muted"> · {formatDistance(ROTATION_LIMIT - currentRotation)} left</Span>
          )}
          {undefined !== suggestedChain && (
            <>
              {' · next '}
              <Span color="green.solid">{suggestedChain}</Span>
            </>
          )}
        </Text>
        <Text fontSize="sm" whiteSpace="nowrap">
          <Span fontStyle="italic">μ</Span> {formatDistance(avg)}
        </Text>
        <SegmentedControl size="sm" value={gearId} onValueChange={handleGearChange} items={bikeCollection.items} />
        <EditEvents onEditEvents={refreshEvents} />
        <EditLabels />
      </Group>
      <Chart.Root width="100%" height="400px" chart={chart}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart.data} layout="vertical" margin={{right: 90, top: 4}} barCategoryGap="30%">
            <XAxis
              type="number"
              stroke={chart.color('fg.muted')}
              tickFormatter={value => formatDistance(Number(value), 0)}
              domain={[0, (dataMax: number) => Math.ceil(Math.max(dataMax, wearLimit ?? 0) * 1.05)]}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={120}
              tickLine={false}
              axisLine={false}
              stroke={chart.color('fg.muted')}
              tick={({x, y, payload}: {x: number | string; y: number | string; payload: {value: string}}) => {
                const isCurrent = payload.value === currentRowLabel;
                const isSuggested = payload.value === suggestedRowLabel;

                return (
                  <text x={Number(x)} y={Number(y)} textAnchor="end" dominantBaseline="central">
                    <tspan
                      x={Number(x)}
                      dy="-0.3em"
                      fontSize={13}
                      fontWeight={isCurrent || isSuggested ? 700 : 400}
                      fill={chart.color(getRowColor(isCurrent, isSuggested))}
                    >
                      {payload.value}
                    </tspan>
                    <tspan x={Number(x)} dy="1.4em" fontSize={11} fill={chart.color('fg.muted')}>
                      {rows.find(({label: rowLabel}) => rowLabel === payload.value)?.avgLabel}
                    </tspan>
                  </text>
                );
              }}
            />
            <Tooltip
              shared={false}
              cursor={false}
              isAnimationActive={false}
              content={({payload, active}) => {
                if (!active || !payload || 0 === payload.length) return null;

                const [{dataKey, value, payload: rowData}] = payload;

                if (0 >= Number(value)) return null;

                // Read the row from its own data: recharts does not reliably pass
                // `label` for a vertical layout with shared={false}.
                const chain = (rowData as {chain?: string} | undefined)?.chain;
                const rotationNumber = Number(String(dataKey).replace('period', '')) + 1;

                return (
                  <ChartTooltip>
                    {chain} · 〰 {rotationNumber} · {formatDistance(Number(value))}
                  </ChartTooltip>
                );
              }}
            />
            {null !== wearLimit && (
              <ReferenceLine
                x={wearLimit}
                stroke={chart.color('fg.muted')}
                strokeDasharray="5 4"
                label={{
                  value: `retired ${formatDistance(wearLimit)}`,
                  position: 'insideBottomLeft',
                  fill: chart.color('fg.muted'),
                  fontSize: 12,
                }}
              />
            )}
            {chart.series.map(item => (
              <Bar
                key={item.name}
                dataKey={chart.key(item.name)}
                stackId="chain"
                maxBarSize={44}
                fill={chart.color(item.color)}
                stroke={chart.color('bg')}
                strokeWidth={2}
                isAnimationActive={false}
              >
                {rows.map(row => (
                  <Cell key={String(row.label)} fillOpacity={row.isCurrent ? 1 : 0.6} />
                ))}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </Chart.Root>
    </>
  );
};

export {ChainChart};
