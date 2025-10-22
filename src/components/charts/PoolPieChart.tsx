import {Group, Span, Text} from '@chakra-ui/react';
import Chart from 'react-apexcharts';
import {useActivities, useLabels} from '../../hooks';
import {getOptions} from '../../models';
import {ActivityType} from '../../models/strava';

const PoolPieChart = () => {
  const [activities] = useActivities({
    withCommute: false,
    withPrivate: true,
    sort: 'date',
    sortDirection: 'asc',
    includedActivityTypes: [ActivityType.Swim],
  });
  const [label] = useLabels();

  const poolMap = (activities ?? []).reduce((map: Record<string, number>, activity) => {
    const poolName = activity.name.match(/^Natation\s+(.+?)(?:\s+\p{Emoji}.*)?$/u)?.[1] ?? 'Unknown';
    map[poolName] = (map[poolName] ?? 0) + 1;

    return map;
  }, {});

  const labels = Object.keys(poolMap).map(key => `${key} ${label(key)}`);
  const series = Object.values(poolMap);

  const seriesAvg = Math.round(series.reduce((acc, val) => acc + val, 0) / series.length) ?? 0;

  return (
    <>
      <Group width="full" gap="20px">
        <Text>
          <Span fontStyle="italic">Pool count</Span> {labels.length}
        </Text>
        <Text>
          <Span fontStyle="italic">μ</Span> {seriesAvg} sessions by pool
        </Text>
      </Group>
      <Chart
        options={getOptions(labels, undefined, {
          legend: {show: false},
          dataLabels: {
            enabled: true,
            formatter: (_, {seriesIndex}) => labels[seriesIndex],
            dropShadow: {enabled: false},
          },
        })}
        series={series}
        type="pie"
        height={400}
      />
    </>
  );
};

export {PoolPieChart};
