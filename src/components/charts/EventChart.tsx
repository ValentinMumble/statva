import {ChangeEvent, useState} from 'react';
import Chart from 'react-apexcharts';
import {useActivities, useEvents, useLabels} from '../../hooks';
import {formatDistance, getEventLabel, getOptions, getRidesBetween} from '../../models';
import {DetailedActivity} from '../../models/strava';
import {EditEvents} from '../../components';
import {NativeSelectField, NativeSelectRoot, Radio, RadioGroup} from '../ui';

const EVENT_TYPES = ['tire', 'brake_pad', 'battery'];
const SUPER6 = 'b13440652';

const EventChart = () => {
  const [data, setData] = useState<keyof DetailedActivity>('distance');
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
  const handleDataChange = (details: any) => setData(details.value); //todo

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

  return (
    <div>
      <div>
        <RadioGroup value={data} display="flex" gap={4} onValueChange={handleDataChange}>
          <Radio value="distance">🗺️</Radio>
          <Radio value="total_elevation_gain">⛰️</Radio>
        </RadioGroup>
        <NativeSelectRoot>
          <NativeSelectField width="70px" value={eventType} onChange={handleEventTypeChange}>
            {EVENT_TYPES.map(eventType => (
              <option key={eventType} value={eventType}>
                {label(eventType)}
              </option>
            ))}
          </NativeSelectField>
        </NativeSelectRoot>
        <EditEvents events={events} onEditEvents={refreshEvents} />
      </div>
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
