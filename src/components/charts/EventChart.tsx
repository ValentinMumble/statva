import {ChangeEvent, useState} from 'react';
import Chart from 'react-apexcharts';
import {FormControl, Select} from '@chakra-ui/react';
import {useActivities, useEvents, useLabels} from '../../hooks';
import {formatDistance, getEventLabel, getOptions, getRidesBetween} from '../../models';
import {EditEvents} from '../../components';

const EVENT_TYPES = ['tire', 'brake_pad', 'battery'];
const SUPER6 = 'b13440652';

const EventChart = () => {
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

  const handleEventTypeChange = ({target}: ChangeEvent<HTMLSelectElement>) => setEventType(target.value);

  const odometer = events.reduce((odometer: {[id: string]: number[]}, event, index) => {
    const nextEventDate = index === events.length - 1 ? null : events[index + 1].date;
    const periodDistance = getRidesBetween(activities, event.date, nextEventDate).reduce(
      (sum, ride) => ride.distance + sum,
      0
    );

    const eventId = `${event.date.toLocaleDateString()} ${getEventLabel(event)}`;

    odometer[eventId] = [...(odometer[eventId] ?? []), periodDistance];

    return odometer;
  }, {});

  const labels: string[] = [];
  const series: ApexAxisChartSeries = [];

  Object.entries(odometer).forEach(([eventLabel, distances], eventIndex) => {
    labels.push(eventLabel.slice(11));

    distances.forEach(distance => {
      const data = new Array(Object.keys(odometer).length).fill(null);
      data[eventIndex] = distance;
      series.push({name: eventLabel, data});
    });
  });

  const chartOptions = getOptions(labels, value => formatDistance(value, 0));

  return (
    <div>
      <FormControl display="flex" alignItems="center" justifyContent="end" paddingEnd="6px" gap="8px">
        <Select size="sm" width="70px" value={eventType} onChange={handleEventTypeChange}>
          {EVENT_TYPES.map(eventType => (
            <option key={eventType} value={eventType}>
              {label(eventType)}
            </option>
          ))}
        </Select>
        <EditEvents events={events} onEditEvents={refreshEvents} />
      </FormControl>
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
    </div>
  );
};

export {EventChart};
