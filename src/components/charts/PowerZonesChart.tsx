import {useMemo, useState} from 'react';
import {Text} from '@chakra-ui/react';
import {Chart, useChart} from '@chakra-ui/charts';
import {Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {useActivityMeta, useFtp, useSettings} from '../../hooks';
import {getZoneColor, zonesPerWeek} from '../../models';
import {ChartTooltip} from './ChartTooltip';

const WEEKS = 16;
const ZONES = [1, 2, 3, 4, 5, 6, 7];

/** Hours in each power zone, week by week, from the FTP of the day. */
const PowerZonesChart = () => {
  const {locale} = useSettings();
  const {activityMeta} = useActivityMeta();
  const {getFtp} = useFtp();
  // Read once, so the weeks do not shift while the page is open.
  const [now] = useState(() => new Date());
  const rows = useMemo(() => zonesPerWeek(Object.values(activityMeta), getFtp, WEEKS, now), [activityMeta, getFtp, now]);
  const chart = useChart({data: rows, series: ZONES.map(zone => ({name: `z${zone}`, label: `Z${zone}`, color: `${getZoneColor(zone)}.solid`}))});
  const hasPower = rows.some(row => ZONES.some(zone => 0 < Number(row[`z${zone}`])));

  if (!hasPower) return <Text color="fg.muted">Worked out from the power data of each ride, a few rides at a time. Nothing in the last weeks yet.</Text>;

  return (
    <Chart.Root width="100%" height="320px" chart={chart}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chart.data}>
          <XAxis
            dataKey="week"
            stroke={chart.color('fg.muted')}
            tickLine={false}
            tickFormatter={week => new Date(week).toLocaleDateString(locale, {day: 'numeric', month: 'short'})}
          />
          <YAxis stroke={chart.color('fg.muted')} width={40} tickLine={false} axisLine={false} tickFormatter={value => `${value} h`} />
          <Legend content={<Chart.Legend />} />
          <Tooltip
            cursor={{fill: chart.color('bg.muted')}}
            isAnimationActive={false}
            content={({payload, label, active}) =>
              !active || !payload?.length ? null : (
                <ChartTooltip>
                  Week of {new Date(String(label)).toLocaleDateString(locale, {day: 'numeric', month: 'long'})}
                  {[...payload].reverse().map(({name, value}) =>
                    0 < Number(value) ? (
                      <div key={String(name)}>
                        {String(name).toUpperCase()}: {Number(value).toFixed(1)} h
                      </div>
                    ) : null,
                  )}
                </ChartTooltip>
              )
            }
          />
          {chart.series.map(({name, color}) => (
            <Bar key={String(name)} dataKey={chart.key(name)} stackId="zones" fill={chart.color(color)} isAnimationActive={false} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Chart.Root>
  );
};

export {PowerZonesChart};
