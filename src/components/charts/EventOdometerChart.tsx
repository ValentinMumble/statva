import {useState} from 'react';
import Chart from 'react-apexcharts';
import {Group, SegmentGroupValueChangeDetails, Span, Text} from '@chakra-ui/react';
import {SegmentedControl} from '../ui';
import {useActivities, useEvents, useLabels} from '../../hooks';
import {formatDistance, getEventLabel, getOptions, getRidesBetween, labelCollection, Event, SUPER6} from '../../models';
import {Activity} from '../../models/strava';

const EVENT_TYPES: Event['type'][] = ['tire', 'cassette', 'brake_pad', 'battery', 'saddle'];
const DATA_TYPES: (keyof Activity)[] = ['distance', 'total_elevation_gain'];

const EventOdometerChart = () => {
  const [gearId, setGearId] = useState<string>(SUPER6);
  const [data, setData] = useState<keyof Activity>('distance');
  const [eventType, setEventType] = useState<string>('tire');
  const [label] = useLabels();
  const [events] = useEvents();
  const [activities] = useActivities({
    withCommute: true,
    withPrivate: true,
    sort: 'date',
    sortDirection: 'asc',
    gearId,
  });

  const handleDataChange = ({value}: SegmentGroupValueChangeDetails) => setData(value as keyof Activity);
  const handleEventTypeChange = ({value}: SegmentGroupValueChangeDetails) => value && setEventType(value);
  const handleGearChange = ({value}: SegmentGroupValueChangeDetails) => value && setGearId(value);

  if (null === events) {
    return null;
  }

  const relevantBikes = [...new Set(events.filter(({type}) => EVENT_TYPES.includes(type)).map(({bike}) => bike))];
  const relevantEvents = events.filter(({bike, type}) => gearId === bike && eventType === type);

  const odometer = relevantEvents.reduce((odometer: {[id: string]: number}, event, index) => {
    const nextEventDate = relevantEvents[index + 1]?.date;
    const periodTotal = getRidesBetween(activities ?? [], event.date, nextEventDate).reduce(
      (sum, ride) => Number(ride[data]) + sum,
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
  const bikeCollection = labelCollection(relevantBikes, key => label(key, true));

  return (
    <>
      <Group width="full" justifyContent="end" gap="20px">
        <Text>
          <Span fontStyle="italic">μ</Span> {formatDistance(avg)}
        </Text>
        <SegmentedControl size="xs" value={gearId} onValueChange={handleGearChange} items={bikeCollection.items} />
        <SegmentedControl
          size="xs"
          value={data}
          onValueChange={handleDataChange}
          items={labelCollection(DATA_TYPES, label).items}
        />
        <SegmentedControl
          size="xs"
          value={eventType}
          onValueChange={handleEventTypeChange}
          items={labelCollection(EVENT_TYPES, label).items}
        />
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

export {EventOdometerChart};
