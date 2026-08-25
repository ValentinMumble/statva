import {Group, Span, Text} from '@chakra-ui/react';
import {Chart, useChart} from '@chakra-ui/charts';
import {Cell, Pie, PieChart, ResponsiveContainer, Tooltip} from 'recharts';
import {getSeriesColor} from '../../models';
import {ChartTooltip} from './ChartTooltip';

type CountPieChartProps = {
  data: Record<string, number>;
  labels: string[];
  entityName: string;
  unitName: string;
};

const CountPieChart = ({data, labels, entityName, unitName}: CountPieChartProps) => {
  const values = Object.values(data);
  const total = values.reduce((total, current) => total + current, 0);
  const seriesAvg = 0 === values.length ? 0 : Math.round(total / values.length);

  const chart = useChart({
    data: Object.keys(data).map((key, index) => ({name: labels[index] ?? key, value: data[key]})),
    series: [{name: 'value', color: 'orange.solid'}],
  });

  return (
    <>
      <Group width="full" gap="20px">
        <Text>
          <Span fontStyle="italic">{entityName} count</Span> {labels.length}
        </Text>
        <Text>
          <Span fontStyle="italic">μ</Span> {seriesAvg} {unitName}
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
              label={({payload}) => (payload as {name: string}).name}
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

export {CountPieChart};
