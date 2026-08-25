import {useState} from 'react';
import {Group, SegmentGroupValueChangeDetails, Spacer, Span, Text} from '@chakra-ui/react';
import {Chart, useChart} from '@chakra-ui/charts';
import {Bar, BarChart, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {SegmentedControl, Switch} from '../../components/ui';
import {EditEvents, EditLabels} from '../../components';
import {ChainEvent, formatDistance, getPeriodColor, getRidesBetween, labelCollection, SUPER6} from '../../models';
import {useActivities, useEvents, useLabels} from '../../hooks';
import {ChartTooltip} from './ChartTooltip';

const RETIRED_CHAINS = ['🍍', '🧄', '🍪', '🍌', '🍋'];
const RETIRED_BIKES = ['b11897955', 'b12655849'];

const getTotal = (distances: number[]): number => distances.reduce((total, current) => total + current, 0);

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
      label: `${chain} ${formatDistance(total / distances.length)} avg`,
      cap: 0,
      isCurrent: chain === currentChain,
      totalLabel: `${formatDistance(total)} 〰 ${distances.length}`,
    };

    distances.forEach((distance, index) => (row[`period${index}`] = distance));

    return row;
  });

  const currentRowLabel = rows.find(({isCurrent}) => isCurrent)?.label;

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
      <Group width="full" justifyContent="end" gap="20px">
        <Switch size="xs" checked={withRetired} onCheckedChange={({checked}) => setWithRetired(checked)}>
          🗄️
        </Switch>
        <Spacer />
        <Text>
          <Span fontStyle="italic">rotation</Span> {currentChain} {formatDistance(currentRotation)}
        </Text>
        <Text>
          <Span fontStyle="italic">μ</Span> {formatDistance(avg)}
        </Text>
        <SegmentedControl size="sm" value={gearId} onValueChange={handleGearChange} items={bikeCollection.items} />
        <EditEvents onEditEvents={refreshEvents} />
        <EditLabels />
      </Group>
      <Chart.Root width="100%" height="400px" chart={chart}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart.data} layout="vertical" margin={{right: 90}}>
            <XAxis
              type="number"
              stroke={chart.color('fg.muted')}
              tickFormatter={value => formatDistance(Number(value), 0)}
              domain={[0, (dataMax: number) => Math.ceil(Math.max(dataMax, wearLimit ?? 0) * 1.05)]}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={110}
              tickLine={false}
              axisLine={false}
              stroke={chart.color('fg.muted')}
              tick={({x, y, payload}: {x: number | string; y: number | string; payload: {value: string}}) => (
                <text
                  x={Number(x)}
                  y={Number(y)}
                  textAnchor="end"
                  dominantBaseline="central"
                  fontSize={12}
                  fontWeight={payload.value === currentRowLabel ? 700 : 400}
                  fill={payload.value === currentRowLabel ? chart.color('orange.solid') : chart.color('fg.muted')}
                >
                  {payload.value}
                </text>
              )}
            />
            <Tooltip
              shared={false}
              cursor={false}
              isAnimationActive={false}
              content={({payload, active}) => {
                if (!active || !payload || 0 === payload.length) return null;

                const [{dataKey, value, payload: rowData}] = payload;

                if ('cap' === dataKey || 0 >= Number(value)) return null;

                // Read the row from its own data: recharts does not reliably pass
                // `label` for a vertical layout with shared={false}.
                const rowLabel = (rowData as {label?: string} | undefined)?.label;
                const rotationNumber = Number(String(dataKey).replace('period', '')) + 1;

                return (
                  <ChartTooltip>
                    {rowLabel} · 〰 {rotationNumber} · {formatDistance(Number(value))}
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
                  value: `μ retired ${formatDistance(wearLimit)}`,
                  position: 'insideTop',
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
            <Bar dataKey="cap" stackId="chain" fill="transparent" isAnimationActive={false}>
              <LabelList
                dataKey="totalLabel"
                content={({x, y, height, value, index}) => {
                  const isCurrent = undefined !== index && Boolean(rows[index]?.isCurrent);

                  return (
                    <text
                      x={Number(x) + 6}
                      y={Number(y) + Number(height) / 2}
                      dominantBaseline="central"
                      fontSize={12}
                      fontWeight={isCurrent ? 700 : 400}
                      fill={isCurrent ? chart.color('orange.solid') : chart.color('fg.muted')}
                    >
                      {value}
                    </text>
                  );
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Chart.Root>
    </>
  );
};

export {ChainChart};
