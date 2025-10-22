import {Group, Span, Text} from '@chakra-ui/react';
import Chart from 'react-apexcharts';
import {useActivities} from '../../hooks';
import {getOptions} from '../../models';
import {ActivityType} from '../../models/strava';

const CourtPieChart = () => {
  const [activities] = useActivities({
    withCommute: false,
    withPrivate: true,
    sort: 'date',
    sortDirection: 'asc',
    includedActivityTypes: [ActivityType.Tennis],
  });

  const courtMap = (activities ?? []).reduce((map: Record<string, number>, activity) => {
    const courtName =
      activity.name.replace(/^Tennis\s+/, '').split(/\s+\p{Emoji}|[-–]/u)[0].trim() || 'Unknown';
    map[courtName] = (map[courtName] ?? 0) + 1;

    return map;
  }, {});

  const labels = Object.keys(courtMap);
  const series = Object.values(courtMap);

  const seriesAvg = Math.round(series.reduce((acc, val) => acc + val, 0) / series.length) ?? 0;

  return (
    <>
      <Group width="full" gap="20px">
        <Text>
          <Span fontStyle="italic">Court count</Span> {labels.length}
        </Text>
        <Text>
          <Span fontStyle="italic">μ</Span> {seriesAvg} sessions by court
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

export {CourtPieChart};
