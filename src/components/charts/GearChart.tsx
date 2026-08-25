import {useState} from 'react';
import {Chart, useChart} from '@chakra-ui/charts';
import {Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {useActivities, useLabels} from '../../hooks';
import {ChartProps, getSeriesColor, getTypes} from '../../models';
import {ActivityType} from '../../models/strava';
import {GearSelect} from '../../components';
import {ChartTooltip} from './ChartTooltip';

const GearChart = ({data, formatter, type}: ChartProps) => {
  const [includedGear, setIncludedGear] = useState<string[] | null>(null);

  const {label} = useLabels();
  const {activities} = useActivities({
    withCommute: true,
    withPrivate: true,
    includedActivityTypes: getTypes(ActivityType.Ride, ActivityType.Run),
  });

  const dataPerGear = (activities ?? []).reduce((gearMap: Record<string, number>, activity) => {
    if (null === activity.gear_id) return gearMap;

    const valueToAdd = 'number' === typeof data ? data : Number(activity[data]);
    gearMap[activity.gear_id] = (gearMap[activity.gear_id] ?? 0) + valueToAdd;

    return gearMap;
  }, {});

  const sortedGear = Object.entries(dataPerGear)
    .filter(([gearId]) => null === includedGear || includedGear.includes(gearId))
    .sort(([, valueA], [, valueB]) => valueB - valueA);

  const chart = useChart({
    data: sortedGear.map(([gearId, value]) => ({gear: label(gearId, true), value})),
    series: [{name: 'value', color: 'orange.solid'}],
  });

  const renderTooltip = () => (
    <Tooltip
      cursor={{fill: chart.color('bg.muted')}}
      isAnimationActive={false}
      content={({payload, active}) => {
        if (!active || !payload?.length) return null;

        const {gear, value} = payload[0].payload as {gear: string; value: number};

        return (
          <ChartTooltip>
            {gear} · {formatter?.(value) ?? value}
          </ChartTooltip>
        );
      }}
    />
  );

  return (
    <>
      <GearSelect
        multiple={true}
        selectedGear={null === includedGear ? sortedGear.map(([gearId]) => gearId) : includedGear}
        onSelectedGearChange={setIncludedGear}
      />
      <Chart.Root width="100%" height="400px" chart={chart}>
        <ResponsiveContainer width="100%" height="100%">
          {'pie' === type ? (
            <PieChart>
              {renderTooltip()}
              <Pie
                data={chart.data}
                dataKey={chart.key('value')}
                nameKey="gear"
                innerRadius="35%"
                outerRadius="75%"
                isAnimationActive={false}
                label={({payload}) => (payload as {gear: string}).gear}
                labelLine={false}
                stroke={chart.color('bg')}
                strokeWidth={2}
              >
                {chart.data.map((row, index) => (
                  <Cell key={row.gear} fill={chart.color(getSeriesColor(index))} fillOpacity={0.75} />
                ))}
              </Pie>
            </PieChart>
          ) : (
            <BarChart data={chart.data}>
              <XAxis dataKey="gear" stroke={chart.color('fg.muted')} tickLine={false} />
              <YAxis
                stroke={chart.color('fg.muted')}
                width={70}
                tickLine={false}
                axisLine={false}
                tickFormatter={value => formatter?.(Number(value)) ?? String(value)}
              />
              {renderTooltip()}
              <Bar
                dataKey={chart.key('value')}
                fill={chart.color('orange.solid')}
                fillOpacity={0.55}
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </Chart.Root>
    </>
  );
};

export {GearChart};
