import {useMemo} from 'react';
import {Text} from '@chakra-ui/react';
import {Chart, useChart} from '@chakra-ui/charts';
import {Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {useActivityMeta} from '../../hooks';
import {getSeriesColor, powerCurveByYear} from '../../models';
import {ChartTooltip} from './ChartTooltip';

// The latest few years, so the lines stay readable.
const YEAR_COUNT = 4;

/** Best average power over each duration, one line per year. */
const PowerCurveChart = () => {
  const {activityMeta} = useActivityMeta();
  const {years, rows} = useMemo(() => powerCurveByYear(Object.values(activityMeta)), [activityMeta]);
  const shown = years.slice(0, YEAR_COUNT);
  const chart = useChart({data: rows, series: shown.map((year, index) => ({name: String(year), color: getSeriesColor(index)}))});

  if (0 === years.length) return <Text color="fg.muted">Worked out from the power data of each ride, a few rides at a time. Nothing yet.</Text>;

  return (
    <Chart.Root width="100%" height="360px" chart={chart}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chart.data}>
          <XAxis dataKey="duration" stroke={chart.color('fg.muted')} tickLine={false} />
          <YAxis stroke={chart.color('fg.muted')} width={56} tickLine={false} axisLine={false} tickFormatter={value => `${value} W`} />
          <Legend content={<Chart.Legend />} />
          <Tooltip
            cursor={{stroke: chart.color('fg.muted'), strokeWidth: 1}}
            isAnimationActive={false}
            content={({payload, label, active}) =>
              !active || !payload?.length ? null : (
                <ChartTooltip>
                  {label}
                  {payload.map(({name, value}) => (
                    <div key={String(name)}>
                      {name}: {null === value || undefined === value ? '–' : `${value} W`}
                    </div>
                  ))}
                </ChartTooltip>
              )
            }
          />
          {chart.series.map(({name, color}) => (
            <Line key={String(name)} dataKey={chart.key(name)} stroke={chart.color(color)} strokeWidth={2} dot={{r: 3}} connectNulls={true} isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Chart.Root>
  );
};

export {PowerCurveChart};
