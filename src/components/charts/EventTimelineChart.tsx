import {useState} from 'react';
import {Group, SegmentGroupValueChangeDetails} from '@chakra-ui/react';
import {Chart, useChart} from '@chakra-ui/charts';
import {Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {SegmentedControl} from '../../components/ui';
import {EditEvents} from '../../components';
import {useActivities, useEvents, useLabels} from '../../hooks';
import {extractEmoji, getEventLabel, getSeriesColor, labelCollection, Event, SUPER6} from '../../models';
import {ChartTooltip} from './ChartTooltip';

const DAY = 24 * 60 * 60 * 1000;
// Types that stay fitted until the next one of the same type replaces them, in row order.
const DURATION_TYPES: Event['type'][] = [
  'chain',
  'tire',
  'cassette',
  'brake_pad',
  'brake_bleed',
  'battery',
  'saddle',
];
// Types that happen at a single point in time.
const ONE_SHOT_TYPES: Event['type'][] = ['fall', 'puncture'];

type Segment = {
  start: number;
  end: number;
  label: string;
  isOngoing: boolean;
};

const EventTimelineChart = () => {
  const [gearId, setGearId] = useState<string>(SUPER6);
  const {label} = useLabels();
  const {events: allEvents, refetch: refreshEvents} = useEvents();
  const {activities} = useActivities({
    withCommute: true,
    withPrivate: true,
    gearId,
  });

  const handleGearChange = ({value}: SegmentGroupValueChangeDetails) => value && setGearId(value);

  const bikeEvents = allEvents.filter(({bike}) => gearId === bike);
  // Ongoing periods run until now: read the clock once so re-renders stay stable.
  const [now] = useState(() => Date.now());
  const firstDate = bikeEvents.at(0)?.date.getTime() ?? now - DAY;
  const domainStart = firstDate - DAY;
  const span = Math.max(now - domainStart, DAY);
  // One-shot events have no duration, so they get a thin fixed-width mark instead.
  const markWidth = span / 150;

  const segmentsPerRow = [...DURATION_TYPES, ...ONE_SHOT_TYPES].reduce(
    (rows: {row: string; segments: Segment[]}[], type) => {
      const typeEvents = bikeEvents.filter(event => type === event.type);

      if (0 === typeEvents.length) return rows;

      const isOneShot = ONE_SHOT_TYPES.includes(type);
      const segments = typeEvents.map((event, index) => {
        const start = event.date.getTime();
        const nextStart = typeEvents[index + 1]?.date.getTime();
        const ride = !isOneShot
          ? undefined
          : activities?.find(
              ({start_date}) =>
                event.date.toLocaleDateString('fr-FR') === new Date(start_date).toLocaleDateString('fr-FR')
            );

        return {
          start,
          end: isOneShot ? start + markWidth : nextStart ?? now,
          label: isOneShot && ride ? extractEmoji(ride.name) : getEventLabel(event, label, true),
          isOngoing: !isOneShot && undefined === nextStart,
        };
      });

      return [...rows, {row: label(type), segments}];
    },
    []
  );

  const maxSegments = segmentsPerRow.reduce((max, {segments}) => Math.max(max, segments.length), 0);
  const segmentKeys = [...Array(maxSegments).keys()];

  // Each colored duration is preceded by a transparent spacer, so a row can hold
  // several bars on one band: recharts has no native range bar.
  const rows: Record<string, string | number>[] = segmentsPerRow.map(({row, segments}) =>
    segments.reduce(
      (rowData: Record<string, string | number>, segment, index) => {
        const previousEnd = index === 0 ? domainStart : segments[index - 1].end;

        return {
          ...rowData,
          [`gap${index}`]: segment.start - previousEnd,
          [`duration${index}`]: segment.end - segment.start,
          [`label${index}`]: segment.label,
        };
      },
      {row}
    )
  );

  const chart = useChart({
    data: rows,
    series: segmentKeys.map(index => ({name: `duration${index}`, color: getSeriesColor(index)})),
  });

  const relevantBikes = [...new Set(allEvents.map(({bike}) => bike))];
  const bikeCollection = labelCollection(relevantBikes, key => label(key, true));

  const formatDate = (timestamp: number): string =>
    new Date(timestamp).toLocaleDateString('en-US', {month: 'short', year: '2-digit'});

  return (
    <>
      <Group width="full" justifyContent="end" gap="20px">
        <SegmentedControl size="sm" value={gearId} onValueChange={handleGearChange} items={bikeCollection.items} />
        <EditEvents onEditEvents={refreshEvents} />
      </Group>
      <Chart.Root width="100%" height="450px" chart={chart}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart.data} layout="vertical" barCategoryGap="20%">
            <XAxis
              type="number"
              domain={[0, span]}
              stroke={chart.color('fg.muted')}
              tickLine={false}
              tickFormatter={value => formatDate(domainStart + Number(value))}
            />
            <YAxis
              type="category"
              dataKey="row"
              width={110}
              stroke={chart.color('fg.muted')}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              shared={false}
              cursor={false}
              isAnimationActive={false}
              content={({payload, label: rowLabel, active}) => {
                if (!active || !payload?.length) return null;

                const [{dataKey, payload: rowData}] = payload;
                const index = Number(String(dataKey).replace('duration', ''));
                const rowSegments = segmentsPerRow.find(({row}) => row === rowLabel)?.segments;
                const segment = rowSegments?.[index];

                if (undefined === segment || undefined === rowData) return null;

                const days = Math.round((segment.end - segment.start) / DAY);

                return (
                  <ChartTooltip>
                    <div>
                      {rowLabel} · {segment.label}
                    </div>
                    <div>
                      {new Date(segment.start).toLocaleDateString('fr-FR')}
                      {ONE_SHOT_TYPES.some(type => label(type) === rowLabel)
                        ? ''
                        : ` 〰 ${segment.isOngoing ? 'now' : new Date(segment.end).toLocaleDateString('fr-FR')} · ${days} days`}
                    </div>
                  </ChartTooltip>
                );
              }}
            />
            {segmentKeys.map(index => (
              <Bar key={`gap${index}`} dataKey={`gap${index}`} stackId="timeline" fill="transparent" isAnimationActive={false} />
            ))}
            {chart.series.map((item, index) => (
              <Bar
                key={item.name}
                dataKey={chart.key(item.name)}
                stackId="timeline"
                fill={chart.color(item.color)}
                fillOpacity={0.75}
                stroke={chart.color('bg')}
                strokeWidth={1}
                isAnimationActive={false}
              >
                <LabelList
                  dataKey={`label${index}`}
                  position="insideLeft"
                  fill={chart.color('fg')}
                  fontSize={11}
                  offset={6}
                />
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </Chart.Root>
    </>
  );
};

export {EventTimelineChart};
