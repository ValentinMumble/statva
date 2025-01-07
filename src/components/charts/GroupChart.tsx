import Chart from 'react-apexcharts';
import {useActivities, useActivityMeta} from '../../hooks';
import {getOptions, getTypes, getWorkoutType} from '../../models';
import {Activity, ActivityType, DetailedActivity, WorkoutType} from '../../models/strava';
import {Group, Span, Text} from '@chakra-ui/react';

const GROUP_RIDES = ['Raymond Ride', 'N-Peloton', 'NP', 'duo'];
const GROUP_TAGS = ['groupe', 'duo'];

const isGroupRide = (ride: Activity, meta: DetailedActivity | null): boolean =>
  ride.athlete_count > 1 ||
  getWorkoutType(ride) === WorkoutType.Race ||
  GROUP_RIDES.some(groupRide => ride.name.toLowerCase().includes(groupRide.toLowerCase())) ||
  GROUP_TAGS.some(tag => (meta?.description ?? '').toLowerCase().includes(tag.toLowerCase()));

const GroupChart = () => {
  const [activityMeta] = useActivityMeta();
  const [activities] = useActivities({
    withCommute: false,
    withPrivate: false,
    includedActivityTypes: getTypes(ActivityType.Ride),
  });

  const map = (activities ?? []).reduce(
    (map, ride) => {
      if (isGroupRide(ride, activityMeta[ride.id] ?? null)) {
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
