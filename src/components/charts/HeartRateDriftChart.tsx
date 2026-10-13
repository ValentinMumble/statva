import {useMemo} from 'react';
import {Text} from '@chakra-ui/react';
import {Chart, useChart} from '@chakra-ui/charts';
import {ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis} from 'recharts';
import {useActivityMeta, useSettings} from '../../hooks';
import {driftByRide} from '../../models';
import {ChartTooltip} from './ChartTooltip';

// Under 5% the effort was held well, the usual reading of Pw:HR decoupling.
const STEADY_DRIFT = 5;

/** How much heart rate rose against power from the first half of each long ride to the second. */
const HeartRateDriftChart = () => {
  const {locale} = useSettings();
  const {activityMeta} = useActivityMeta();
  const rides = useMemo(() => driftByRide(Object.values(activityMeta)), [activityMeta]);
  const chart = useChart({data: rides, series: [{name: 'drift', color: 'pink.solid'}]});

  if (0 === rides.length) return <Text color="fg.muted">Needs rides of an hour or more with power and heart rate, worked out a few at a time.</Text>;

  return (
    <>
      <Text fontSize="sm" color="fg.muted" marginBottom="8px">
        Under {STEADY_DRIFT}%: your heart held the effort well to the end.
      </Text>
      <Chart.Root width="100%" height="320px" chart={chart}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart>
            <XAxis
              dataKey="date"
              type="number"
              domain={['dataMin', 'dataMax']}
              stroke={chart.color('fg.muted')}
              tickLine={false}
              tickFormatter={date => new Date(date).toLocaleDateString(locale, {month: 'short', year: '2-digit'})}
            />
            <YAxis dataKey="drift" stroke={chart.color('fg.muted')} width={48} tickLine={false} axisLine={false} tickFormatter={value => `${value}%`} />
            <ReferenceLine y={STEADY_DRIFT} stroke={chart.color('fg.muted')} strokeDasharray="5 4" />
            <Tooltip
              isAnimationActive={false}
              content={({payload, active}) => {
                const ride = payload?.[0]?.payload as (typeof rides)[number] | undefined;
                return !active || undefined === ride ? null : (
                  <ChartTooltip>
                    {new Date(ride.date).toLocaleDateString()} · {ride.name}
                    <div>{ride.drift}% drift</div>
                  </ChartTooltip>
                );
              }}
            />
            <Scatter data={chart.data} fill={chart.color('pink.solid')} isAnimationActive={false} />
          </ScatterChart>
        </ResponsiveContainer>
      </Chart.Root>
    </>
  );
};

export {HeartRateDriftChart};
