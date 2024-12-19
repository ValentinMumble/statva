import {useState} from 'react';
import Chart from 'react-apexcharts';
import {Group, SegmentGroupValueChangeDetails, Span, Text} from '@chakra-ui/react';
import {SegmentedControl, Skeleton} from '../../components/ui';
import {EditEvents} from '../../components';
import {useActivities, useEvents, useLabels} from '../../hooks';
import {formatDistance, getEventLabel, getOptions, getRidesBetween, labelCollection, Event} from '../../models';
import {Activity} from '../../models/strava';

const EVENT_TYPES: Event['type'][] = ['tire', 'brake_pad', 'battery', 'cassette', 'saddle'];
const DATA_TYPES: (keyof Activity)[] = ['distance', 'total_elevation_gain'];
const SUPER6 = 'b13440652';

const EventChart = () => {
  const [data, setData] = useState<keyof Activity>('distance');
  const [eventType, setEventType] = useState<string>('tire');
  const [label] = useLabels();
  const [events, refreshEvents] = useEvents(eventType);
  const [activities] = useActivities({
    withCommute: true,
    withPrivate: true,
    sort: 'date',
    sortDirection: 'asc',
    gearId: SUPER6,
  });

  const handleDataChange = ({value}: SegmentGroupValueChangeDetails) => setData(value as keyof Activity);
  const handleEventTypeChange = ({value}: SegmentGroupValueChangeDetails) => setEventType(value);

  const odometer =
    null === events
      ? {}
      : events.reduce((odometer: {[id: string]: number}, event, index) => {
          const nextEventDate = events[index + 1]?.date;
          const periodTotal = getRidesBetween(activities ?? [], event.date, nextEventDate).reduce(
            (sum, ride) => (ride[data] as number) + sum,
            0
          );

          odometer[`${event.date.toLocaleDateString()} ${getEventLabel(event, label, true)}`] = periodTotal;

          return odometer;
        }, {});

  const labels: string[] = [];
  const series: ApexAxisChartSeries = [];

  Object.entries(odometer).forEach(([eventLabel, total], eventIndex) => {
    // Remove date + space
    labels.push(eventLabel.slice(11));

    const data = new Array(Object.keys(odometer).length).fill(null);
    data[eventIndex] = total;
    series.push({name: eventLabel, data});
  });

  const avg = Object.values(odometer)
    .filter(total => 0 < total)
    .reduce((total, currentTotal, _index, entries) => total + currentTotal / entries.length, 0);

  const chartOptions = getOptions(labels, value => formatDistance(value, 0));

  if (null === events) {
    return <Skeleton height="200px" />;
  }

  return (
    <>
      <Group width="full" justifyContent="end" gap="20px">
        <Text>
          <Span fontStyle="italic">μ</Span> {formatDistance(avg)}
        </Text>
        <SegmentedControl
          size="sm"
          value={data}
          onValueChange={handleDataChange}
          items={labelCollection(DATA_TYPES, label).items}
        />
        <SegmentedControl
          size="sm"
          value={eventType}
          onValueChange={handleEventTypeChange}
          items={labelCollection(EVENT_TYPES, label).items}
        />
        <EditEvents onEditEvents={refreshEvents} />
      </Group>
      <Chart
        options={{
          ...chartOptions,
          chart: {
            ...chartOptions.chart,
            stacked: true,
          },
          plotOptions: {
            bar: {
              dataLabels: {
                total: {
                  enabled: true,
                  formatter: value => formatDistance(Number(value)),
                  style: {color: 'lightgray'},
                },
              },
            },
          },
          legend: {show: false},
        }}
        series={series}
        type="bar"
        height={400}
      />
    </>
  );
};

export {EventChart};
