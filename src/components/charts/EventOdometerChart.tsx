import {useState} from 'react';
import {Group, SegmentGroupValueChangeDetails, Span, Text} from '@chakra-ui/react';
import {Chart, useChart} from '@chakra-ui/charts';
import {Bar, BarChart, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {SegmentedControl} from '../ui';
import {useActivities, useEvents, useLabels} from '../../hooks';
import {
  formatDistance,
  getEventLabel,
  getPeriodColor,
  getRidesBetween,
  labelCollection,
  Event,
  SUPER6,
} from '../../models';
import {Activity} from '../../models/strava';
import {ChartTooltip} from './ChartTooltip';

const EVENT_TYPES: Event['type'][] = ['tire', 'cassette', 'brake_pad', 'brake_bleed', 'battery', 'saddle'];
const DATA_TYPES: (keyof Activity)[] = ['distance', 'total_elevation_gain'];

const getTotal = (values: number[]): number => values.reduce((total, current) => total + current, 0);

const EventOdometerChart = () => {
  const [gearId, setGearId] = useState<string>(SUPER6);
  const [data, setData] = useState<keyof Activity>('distance');
  const [eventType, setEventType] = useState<string>('tire');
  const {label} = useLabels();
  const {events} = useEvents();
  const {activities} = useActivities({
    withCommute: true,
    withPrivate: true,
    sort: 'date',
    sortDirection: 'asc',
    gearId,
  });

  const handleDataChange = ({value}: SegmentGroupValueChangeDetails) => setData(value as keyof Activity);
  const handleEventTypeChange = ({value}: SegmentGroupValueChangeDetails) => value && setEventType(value);
  const handleGearChange = ({value}: SegmentGroupValueChangeDetails) => value && setGearId(value);

  const relevantBikes = [...new Set(events.filter(({type}) => EVENT_TYPES.includes(type)).map(({bike}) => bike))];
  const relevantEvents = events.filter(({bike, type}) => gearId === bike && eventType === type);

  const getEventKey = (event: Event): string =>
    'cassette' === event.type ? getEventLabel(event, label, true) : event.id;

  const odometer = relevantEvents.reduce(
    (odometer: Record<string, {label: string; values: number[]}>, event, index) => {
      const nextEventDate = relevantEvents[index + 1]?.date;
      const periodTotal = getRidesBetween(activities ?? [], event.date, nextEventDate).reduce(
        (sum, ride) => Number(ride[data]) + sum,
        0
      );
      const key = getEventKey(event);

      const entry = odometer[key] ?? {label: getEventLabel(event, label, true), values: []};
      entry.values.push(periodTotal);
      odometer[key] = entry;

      return odometer;
    },
    {}
  );

  const lastEvent = relevantEvents.at(-1);
  const currentKey = undefined === lastEvent ? undefined : getEventKey(lastEvent);

  const displayedKeys = Object.keys(odometer);

  const maxPeriods = displayedKeys.reduce((max, key) => Math.max(max, odometer[key].values.length), 0);
  const periodKeys = [...Array(maxPeriods).keys()].map(index => `period${index}`);

  const rows = displayedKeys.map(key => {
    const {label: partLabel, values} = odometer[key];
    const total = getTotal(values);
    const row: Record<string, number | string | boolean> = {
      label: partLabel,
      cap: 0,
      isCurrent: key === currentKey,
      totalLabel: `${formatDistance(total)}${1 < values.length ? ` 〰 ${values.length}` : ''}`,
    };

    values.forEach((value, index) => (row[`period${index}`] = value));

    return row;
  });

  const currentRowLabel = rows.find(({isCurrent}) => isCurrent)?.label;

  const chart = useChart({
    data: rows,
    series: periodKeys.map((name, index) => ({name, color: getPeriodColor(index)})),
  });

  const avg = displayedKeys
    .map(key => getTotal(odometer[key].values))
    .filter(total => 0 < total)
    .reduce((total, currentTotal, _index, entries) => total + currentTotal / entries.length, 0);

  const bikeCollection = labelCollection(relevantBikes, key => label(key, true));

  if (0 === events.length) {
    return null;
  }

  return (
    <>
      <Group width="full" justifyContent="end" gap="20px">
        <Text>
          <Span fontStyle="italic">μ</Span> {formatDistance(avg)}
        </Text>
        <SegmentedControl size="xs" value={gearId} onValueChange={handleGearChange} items={bikeCollection.items} />
        <SegmentedControl
          size="xs"
          value={data}
          onValueChange={handleDataChange}
          items={labelCollection(DATA_TYPES, label).items}
        />
        <SegmentedControl
          size="xs"
          value={eventType}
          onValueChange={handleEventTypeChange}
          items={labelCollection(EVENT_TYPES, label).items}
        />
      </Group>
      <Chart.Root width="100%" height="400px" chart={chart}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart.data} layout="vertical" margin={{right: 90}}>
            <XAxis
              type="number"
              stroke={chart.color('fg.muted')}
              tickFormatter={value => formatDistance(Number(value), 0)}
              domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.05)]}
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
              content={({payload, label: rowLabel, active}) => {
                if (!active || !payload || 0 === payload.length) return null;

                const [{dataKey, value}] = payload;

                if ('cap' === dataKey || 0 >= Number(value)) return null;

                const row = rows.find(({label: candidate}) => candidate === rowLabel);
                const rotationNumber = Number(String(dataKey).replace('period', '')) + 1;
                const hasMultiplePeriods = undefined !== row && periodKeys.filter(key => key in row).length > 1;

                return (
                  <ChartTooltip>
                    {rowLabel} · {hasMultiplePeriods ? `〰 ${rotationNumber} · ` : ''}
                    {formatDistance(Number(value))}
                  </ChartTooltip>
                );
              }}
            />
            <ReferenceLine
              x={avg}
              stroke={chart.color('fg.muted')}
              strokeDasharray="5 4"
              label={{value: `μ ${formatDistance(avg)}`, position: 'insideTop', fill: chart.color('fg.muted'), fontSize: 12}}
            />
            {chart.series.map(item => (
              <Bar
                key={item.name}
                dataKey={chart.key(item.name)}
                stackId="part"
                fill={chart.color(item.color)}
                stroke={chart.color('bg')}
                strokeWidth={2}
                isAnimationActive={false}
              >
                {rows.map((row, rowIndex) => (
                  <Cell key={`${String(row.label)}-${rowIndex}`} fillOpacity={row.isCurrent ? 1 : 0.6} />
                ))}
              </Bar>
            ))}
            <Bar dataKey="cap" stackId="part" fill="transparent" isAnimationActive={false}>
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

export {EventOdometerChart};
