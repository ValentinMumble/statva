import {useMemo} from 'react';
import {Text} from '@chakra-ui/react';
import {Chart, useChart} from '@chakra-ui/charts';
import {Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {useAllActivities} from '../../hooks';
import {getTypes, GRADES, gradesByYear} from '../../models';
import {ActivityType} from '../../models/strava';
import {ChartTooltip} from './ChartTooltip';

/** The share of each year's rides in each grade, from flat to mountainous. */
const GradesChart = () => {
  const {data} = useAllActivities();
  const rows = useMemo(() => {
    const rides = getTypes(ActivityType.Ride);

    // Shares in percent, so years with more riding compare with the others.
    return gradesByYear((data ?? []).filter(({sport_type}) => rides.includes(sport_type))).map(
      ({year, total, counts}): Record<string, number | string> => ({
        year: String(year),
        total,
        ...Object.fromEntries(Object.entries(counts).map(([name, count]) => [name, (count / total) * 100])),
      }),
    );
  }, [data]);
  const chart = useChart({data: rows, series: GRADES.map(([, {name, colorPalette}]) => ({name, color: `${colorPalette}.solid`}))});

  if (0 === rows.length) return <Text color="fg.muted">No ride to grade yet.</Text>;

  return (
    <>
      <Text fontSize="sm" color="fg.muted" marginBottom="8px">
        Each ride graded against all of yours, by the share of its distance it climbs.
      </Text>
      <Chart.Root width="100%" height="320px" chart={chart}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart.data}>
            <XAxis dataKey="year" stroke={chart.color('fg.muted')} tickLine={false} />
            <YAxis stroke={chart.color('fg.muted')} width={44} tickLine={false} axisLine={false} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} allowDataOverflow={true} tickFormatter={value => `${value}%`} />
            <Legend content={<Chart.Legend />} />
            <Tooltip
              cursor={{fill: chart.color('bg.muted')}}
              isAnimationActive={false}
              content={({payload, label, active}) =>
                !active || !payload?.length ? null : (
                  <ChartTooltip>
                    {label} · {(payload[0].payload as {total: number}).total} rides
                    {[...payload].reverse().map(({name, value}) => (
                      <div key={String(name)}>
                        {name}: {Math.round(Number(value))}%
                      </div>
                    ))}
                  </ChartTooltip>
                )
              }
            />
            {chart.series.map(({name, color}) => (
              <Bar key={String(name)} dataKey={chart.key(name)} stackId="grades" fill={chart.color(color)} isAnimationActive={false} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </Chart.Root>
    </>
  );
};

export {GradesChart};
