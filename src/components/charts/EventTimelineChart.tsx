import {useState} from 'react';
import {Group, SegmentGroupValueChangeDetails} from '@chakra-ui/react';
import {Chart, useChart} from '@chakra-ui/charts';
import {Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {SegmentedControl} from '../../components/ui';
import {useActivities, useEvents, useLabels, useSettings} from '../../hooks';
import {extractEmoji, getEventLabel, getSeriesColor, labelCollection, Event} from '../../models';
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
const CHARACTER_WIDTH = 6.4;
const LABEL_PADDING = 6;
const MIN_LABEL_CHARACTERS = 3;

type Segment = {
  start: number;
  end: number;
  label: string;
  isOngoing: boolean;
  isOneShot: boolean;
};

// Given a bike, the chart follows it and leaves the choice to the page.
const EventTimelineChart = ({bike}: {bike?: string} = {}) => {
  const {defaultBike} = useSettings();
  const [chosenBike, setGearId] = useState<string | null>(null);
  const gearId = bike ?? chosenBike ?? defaultBike;
  const {label} = useLabels();
  const {events: allEvents} = useEvents();
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
  // One-shot events have no duration, so they get a fixed-width mark instead. Keep it
  // wide enough to be visible and to hover for a tooltip.
  const markWidth = span / 80;

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
          isOneShot,
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
    // Colour comes from the row (one hue per part type), set per Cell below.
    series: segmentKeys.map(index => ({name: `duration${index}`})),
  });

  const relevantBikes = [...new Set(allEvents.map(({bike}) => bike))];
  const bikeCollection = labelCollection(relevantBikes, key => label(key, true));

  const formatDate = (timestamp: number): string =>
    new Date(timestamp).toLocaleDateString('en-US', {month: 'short', year: '2-digit'});

  return (
    <>
      <Group width="full" justifyContent="end" gap="20px">
        {undefined === bike && (
          <SegmentedControl size="sm" value={gearId} onValueChange={handleGearChange} items={bikeCollection.items} />
        )}
      </Group>
      <Chart.Root width="100%" height="450px" chart={chart}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart.data} layout="vertical" barCategoryGap="20%" margin={{left: 0, right: 24, top: 8}}>
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
              width={44}
              stroke={chart.color('fg.muted')}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              shared={false}
              cursor={false}
              isAnimationActive={false}
              content={({payload, active}) => {
                if (!active || !payload?.length) return null;

                // Everything comes from the hovered row's own data: recharts does not
                // reliably pass `label` for a vertical layout with shared={false}.
                const [{dataKey, name, payload: rowData}] = payload;
                const key = String(dataKey ?? name ?? '');
                const rowLabel = (rowData as {row?: string} | undefined)?.row;

                if (!key.startsWith('duration') || undefined === rowLabel) return null;

                const index = Number(key.replace('duration', ''));
                const segment = segmentsPerRow.find(({row}) => row === rowLabel)?.segments[index];

                if (undefined === segment) return null;

                const days = Math.round((segment.end - segment.start) / DAY);

                return (
                  <ChartTooltip>
                    <div>
                      {rowLabel} · {segment.label}
                    </div>
                    <div>
                      {new Date(segment.start).toLocaleDateString('fr-FR')}
                      {segment.isOneShot
                        ? ''
                        : ` 〰 ${segment.isOngoing ? 'now' : new Date(segment.end).toLocaleDateString('fr-FR')} · ${days} days`}
                    </div>
                  </ChartTooltip>
                );
              }}
            />
            {/* Spacer and duration must alternate: recharts stacks in JSX order. */}
            {segmentKeys.flatMap(index => [
              <Bar
                key={`gap${index}`}
                dataKey={`gap${index}`}
                stackId="timeline"
                fill="transparent"
                style={{pointerEvents: 'none'}}
                isAnimationActive={false}
              />,
              <Bar
                key={`duration${index}`}
                dataKey={`duration${index}`}
                stackId="timeline"
                stroke={chart.color('bg')}
                strokeWidth={1}
                isAnimationActive={false}
              >
                {segmentsPerRow.map(({row}, rowIndex) => (
                  <Cell
                    key={row}
                    fill={chart.color(getSeriesColor(rowIndex))}
                    fillOpacity={0 === index % 2 ? 0.85 : 0.5}
                  />
                ))}
                <LabelList
                  dataKey={`label${index}`}
                  content={({x, y, width, height, value}) => {
                    const text = String(value ?? '');
                    // Skip the label when the bar is too narrow for it: overlapping
                    // text made the timeline unreadable. The tooltip still has it.
                    const maxCharacters = Math.floor((Number(width) - LABEL_PADDING * 2) / CHARACTER_WIDTH);

                    if ('' === text || maxCharacters < MIN_LABEL_CHARACTERS) return null;

                    return (
                      <text
                        x={Number(x) + LABEL_PADDING}
                        y={Number(y) + Number(height) / 2}
                        dominantBaseline="central"
                        fontSize={11}
                        fill={chart.color('fg')}
                        pointerEvents="none"
                      >
                        {text.length > maxCharacters ? `${text.slice(0, maxCharacters - 1)}…` : text}
                      </text>
                    );
                  }}
                />
              </Bar>,
            ])}
          </BarChart>
        </ResponsiveContainer>
      </Chart.Root>
    </>
  );
};

export {EventTimelineChart};
