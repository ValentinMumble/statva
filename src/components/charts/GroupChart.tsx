import Chart from 'react-apexcharts';
import {useActivities} from '../../hooks';
import {getOptions, getTypes} from '../../models';
import {Activity, ActivityType} from '../../models/strava';
import {Group, Span, Text} from '@chakra-ui/react';

const isGroupRide = (ride: Activity): boolean => {
  if (ride.athlete_count > 1 || ride.name.includes('N-Peloton')) {
    return true;
  }

  return false;
};

const GroupChart = () => {
  const [activities] = useActivities({
    withCommute: false,
    withPrivate: false,
    includedActivityTypes: getTypes(ActivityType.Ride),
  });

  const map = (activities ?? []).reduce(
    (map, ride) => {
      if (isGroupRide(ride)) {
        map.Group++;
      } else {
        map.Solo++;
      }

      return map;
    },
    {Solo: 0, Group: 0}
  );

  const labels = Object.keys(map);
  const series = Object.values(map);

  return (
    <>
      <Group width="full" gap="20px">
        <Text>
          <Span fontStyle="italic">Ride count</Span> {activities?.length}
        </Text>
      </Group>
      <Chart
        options={getOptions(labels, undefined, {
          legend: {show: false},
          dataLabels: {
            enabled: true,
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

export {GroupChart};
