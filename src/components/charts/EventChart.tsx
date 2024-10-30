import {useState} from 'react';
import Chart from 'react-apexcharts';
import {createListCollection, Group, SelectValueChangeDetails} from '@chakra-ui/react';
import {Radio, RadioGroup, SelectContent, SelectItem, SelectRoot, SelectTrigger, SelectValueText} from '../ui';
import {EditEvents} from '../../components';
import {useActivities, useEvents, useLabels} from '../../hooks';
import {formatDistance, getEventLabel, getOptions, getRidesBetween} from '../../models';
import {DetailedActivity} from '../../models/strava';

const EVENT_TYPES = ['tire', 'brake_pad', 'battery'];
const SUPER6 = 'b13440652';

const EventChart = () => {
  const [data, setData] = useState<keyof DetailedActivity>('distance');
  const [eventTypes, setEventTypes] = useState<string[]>(['tire']);
  const [label] = useLabels();
  const [events, refreshEvents] = useEvents(eventTypes[0]);
  const [activities] = useActivities({
    withCommute: true,
    withPrivate: true,
    sort: 'date',
    sortDirection: 'asc',
    gearId: SUPER6,
  });

  const handleDataChange = (details: any) => setData(details.value); //todo
  const handleEventTypeChange = ({value}: SelectValueChangeDetails) => setEventTypes(value);

  const odometer = events.reduce((odometer: {[id: string]: number[]}, event, index) => {
    const nextEventDate = index === events.length - 1 ? null : events[index + 1].date;
    const periodTotal = getRidesBetween(activities ?? [], event.date, nextEventDate).reduce(
      (sum, ride) => (ride[data] as number) + sum,
      0
    );

    const eventId = `${event.date.toLocaleDateString()} ${getEventLabel(event)}`;

    odometer[eventId] = [...(odometer[eventId] ?? []), periodTotal];

    return odometer;
  }, {});

  const labels: string[] = [];
  const series: ApexAxisChartSeries = [];

  Object.entries(odometer).forEach(([eventLabel, totals], eventIndex) => {
    labels.push(eventLabel.slice(11));

    totals.forEach(total => {
      const data = new Array(Object.keys(odometer).length).fill(null);
      data[eventIndex] = total;
      series.push({name: eventLabel, data});
    });
  });

  const chartOptions = getOptions(labels, value => formatDistance(value, 0));
  const eventTypeCollection = createListCollection({
    items: EVENT_TYPES.map(eventType => ({value: eventType, label: label(eventType)})),
  });

  return (
    <>
      <Group width="full" justifyContent="end">
        <RadioGroup value={data} display="flex" gap={4} onValueChange={handleDataChange}>
          <Radio value="distance">🗺️</Radio>
          <Radio value="total_elevation_gain">⛰️</Radio>
        </RadioGroup>
        <SelectRoot
          width="70px"
          collection={eventTypeCollection}
          value={eventTypes}
          onValueChange={handleEventTypeChange}
        >
          <SelectTrigger>
            <SelectValueText />
          </SelectTrigger>
          <SelectContent>
            {eventTypeCollection.items.map(eventType => (
              <SelectItem item={eventType} key={eventType.value}>
                {eventType.label}
              </SelectItem>
            ))}
          </SelectContent>
        </SelectRoot>
        <EditEvents events={events} onEditEvents={refreshEvents} />
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
