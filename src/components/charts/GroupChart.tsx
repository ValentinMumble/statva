import {Group, Span, Text} from '@chakra-ui/react';
import {Chart, useChart} from '@chakra-ui/charts';
import {Cell, Pie, PieChart, ResponsiveContainer, Tooltip} from 'recharts';
import {useActivities, useActivityMeta} from '../../hooks';
import {getSeriesColor, getTypes, getWorkoutType} from '../../models';
import {Activity, ActivityType, DetailedActivity, WorkoutType} from '../../models/strava';
import {ChartTooltip} from './ChartTooltip';

const GROUP_RIDES = ['Raymond Ride', 'N-Peloton', 'NP', 'duo'];
const GROUP_TAGS = ['groupe', 'duo'];

const isGroupRide = (ride: Activity, meta: DetailedActivity | null): boolean =>
  ride.athlete_count > 1 ||
  getWorkoutType(ride) === WorkoutType.Race ||
  GROUP_RIDES.some(groupRide => ride.name.toLowerCase().includes(groupRide.toLowerCase())) ||
  GROUP_TAGS.some(tag => (meta?.description ?? '').toLowerCase().includes(tag.toLowerCase()));

const GroupChart = () => {
  const {activityMeta} = useActivityMeta();
  const {activities} = useActivities({
    withCommute: false,
    withPrivate: false,
    includedActivityTypes: getTypes(ActivityType.Ride),
  });

  const counts = (activities ?? []).reduce(
    (counts, ride) => {
      if (isGroupRide(ride, activityMeta[ride.id] ?? null)) {
        counts.Group++;
      } else {
        counts.Solo++;
      }

      return counts;
    },
    {Solo: 0, Group: 0}
  );

  const total = counts.Solo + counts.Group;

  const chart = useChart({
    data: Object.entries(counts).map(([name, value]) => ({name, value})),
    series: [{name: 'value', color: 'orange.solid'}],
  });

  return (
    <>
      <Group width="full" gap="20px">
        <Text>
          <Span fontStyle="italic">Ride count</Span> {activities?.length}
        </Text>
      </Group>
      <Chart.Root width="100%" height="400px" chart={chart}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              isAnimationActive={false}
              content={({payload, active}) => {
                if (!active || !payload?.length) return null;

                const {name, value} = payload[0].payload as {name: string; value: number};

                return (
                  <ChartTooltip>
                    {name} · {value} ({Math.round((value / total) * 100)}%)
                  </ChartTooltip>
                );
              }}
            />
            <Pie
              data={chart.data}
              dataKey={chart.key('value')}
              nameKey="name"
              innerRadius="35%"
              outerRadius="75%"
              isAnimationActive={false}
              label={({payload}) => {
                const {name, value} = payload as {name: string; value: number};

                return `${name} ${value}`;
              }}
              labelLine={false}
              stroke={chart.color('bg')}
              strokeWidth={2}
            >
              {chart.data.map((row, index) => (
                <Cell key={row.name} fill={chart.color(getSeriesColor(index))} fillOpacity={0.75} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </Chart.Root>
    </>
  );
};

export {GroupChart};
