import {Group, Span, Text} from '@chakra-ui/react';
import Chart from 'react-apexcharts';
import {useActivities, useLabels} from '../../hooks';
import {extractNPGroup, getOptions} from '../../models';

const NPGroupPieChart = () => {
  const [activities] = useActivities({
    withCommute: false,
    withPrivate: true,
    search: 'N-Peloton',
    sort: 'date',
    sortDirection: 'asc',
  });
  const [label] = useLabels();

  const groupMap = (activities ?? []).reduce((map: Record<string, number>, activity) => {
    const groupName = extractNPGroup(activity.name);

    map[groupName] = (map[groupName] ?? 0) + 1;

    return map;
  }, {});

  const groupMapSortedByKey = Object.fromEntries(
    Object.entries(groupMap).sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
  );
  const labels = Object.keys(groupMapSortedByKey).map(key => label(key));
  const series = Object.values(groupMapSortedByKey);

  const seriesAvg = Math.round(series.reduce((acc, val) => acc + val, 0) / series.length) ?? 0;

  return (
    <>
      <Group width="full" gap="20px">
        <Text>
          <Span fontStyle="italic">Group count</Span> {labels.length}
        </Text>
        <Text>
          <Span fontStyle="italic">μ</Span> {seriesAvg} sessions by group
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

export {NPGroupPieChart};
