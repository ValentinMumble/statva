import {useMemo} from 'react';
import {Text} from '@chakra-ui/react';
import {Chart, useChart} from '@chakra-ui/charts';
import {ComposedChart, Line, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis} from 'recharts';
import {useActivityMeta, useSettings} from '../../hooks';
import {aerobicEfficiency} from '../../models';
import {ChartTooltip} from './ChartTooltip';

// The trend line averages this many rides, so one hot day does not swing it.
const TREND_RIDES = 15;

/** Normalized power per heartbeat, ride by ride, with a moving average. */
const AerobicFitnessChart = () => {
  const {locale} = useSettings();
  const {activityMeta} = useActivityMeta();
  const points = useMemo(() => {
    const rides = aerobicEfficiency(Object.values(activityMeta));

    return rides.map((ride, index) => {
      const recent = rides.slice(Math.max(0, index - TREND_RIDES + 1), index + 1);
      return {
        ...ride,
        trend: Math.round((recent.reduce((sum, {efficiency}) => sum + efficiency, 0) / recent.length) * 100) / 100,
      };
    });
  }, [activityMeta]);
  const chart = useChart({
    data: points,
    series: [
      {name: 'efficiency', color: 'teal.solid'},
      {name: 'trend', color: 'orange.solid'},
    ],
  });

  if (0 === points.length)
    return <Text color="fg.muted">Needs rides with both a normalized power and a heart rate.</Text>;

  return (
    <>
      <Text fontSize="sm" color="fg.muted" marginBottom="8px">
        Watts per beat: higher means the same effort costs your heart less.
      </Text>
      <Chart.Root width="100%" height="320px" chart={chart}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chart.data}>
            <XAxis
              dataKey="date"
              type="number"
              domain={['dataMin', 'dataMax']}
              stroke={chart.color('fg.muted')}
              tickLine={false}
              tickFormatter={date => new Date(date).toLocaleDateString(locale, {month: 'short', year: '2-digit'})}
            />
            <YAxis
              stroke={chart.color('fg.muted')}
              width={40}
              tickLine={false}
              axisLine={false}
              domain={['auto', 'auto']}
            />
            <Tooltip
              isAnimationActive={false}
              content={({payload, active}) => {
                const point = payload?.[0]?.payload as (typeof points)[number] | undefined;
                return !active || undefined === point ? null : (
                  <ChartTooltip>
                    {new Date(point.date).toLocaleDateString()} · {point.name}
                    <div>
                      {point.efficiency} W per beat · trend {point.trend}
                    </div>
                  </ChartTooltip>
                );
              }}
            />
            <Scatter
              dataKey={chart.key('efficiency')}
              fill={chart.color('teal.solid')}
              fillOpacity={0.5}
              isAnimationActive={false}
            />
            <Line
              dataKey={chart.key('trend')}
              stroke={chart.color('orange.solid')}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </Chart.Root>
    </>
  );
};

export {AerobicFitnessChart};
