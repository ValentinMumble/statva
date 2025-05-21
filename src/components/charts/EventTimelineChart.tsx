import Chart from 'react-apexcharts';
import {SegmentedControl} from '../../components/ui';
import {EditEvents} from '../../components';
import {useActivities, useEvents, useLabels} from '../../hooks';
import {
  getOptions,
  ChainEvent,
  getNextEvent,
  isChainEvent,
  isBatteryEvent,
  isCassetteEvent,
  isBrakePadEvent,
  isTireEvent,
  getEventLabel,
  isSaddleEvent,
  isFallEvent,
  isPunctureEvent,
  SUPER6,
  labelCollection,
  extractEmoji,
  isBrakeBleedEvent,
} from '../../models';
import {useState} from 'react';
import {Group, SegmentGroupValueChangeDetails} from '@chakra-ui/react';

const EventTimelineChart = () => {
  const [gearId, setGearId] = useState<string>(SUPER6);
  const [label] = useLabels();
  const [allEvents, refreshEvents] = useEvents();
  const [activities] = useActivities({
    withCommute: true,
    withPrivate: true,
    gearId,
  });

  const handleGearChange = ({value}: SegmentGroupValueChangeDetails) => value && setGearId(value);

  if (null === allEvents) {
    return null;
  }

  const relevantBikes = [...new Set(allEvents.map(({bike}) => bike))];
  const bikeEvents = allEvents.filter(({bike}) => gearId === bike);

  const chainEvents = bikeEvents.filter(isChainEvent);
  const eventsIndexedByChain = chainEvents.reduce(
    (eventsIndexedByChain: {[key: string]: ChainEvent[]}, event: ChainEvent) => {
      const events = eventsIndexedByChain[event.chain] ?? [];
      eventsIndexedByChain[event.chain] = [...events, event];

      return eventsIndexedByChain;
    },
    {}
  );

  const chainSeries = Object.entries(eventsIndexedByChain).map(([chain, events]) => ({
    name: chain,
    data: events.map(event => ({
      x: `${label(event.type)} ${label(event.bike, true)}`,
      y: [
        event.date.getTime(),
        (getNextEvent(chainEvents, event, ({bike}) => event.bike === bike)?.date ?? new Date()).getTime(),
      ],
    })),
  }));

  const eventSeries = [isBatteryEvent, isCassetteEvent, isBrakePadEvent, isBrakeBleedEvent, isSaddleEvent, isTireEvent]
    .map(isEventType =>
      bikeEvents.filter(isEventType).map(event => ({
        name: getEventLabel(event, label),
        data: [
          {
            x: label(event.type),
            y: [
              event.date.getTime(),
              (getNextEvent(bikeEvents.filter(isEventType), event)?.date ?? new Date()).getTime(),
            ],
          },
        ],
      }))
    )
    .flat();

  const oneShotEventSeries = [isFallEvent, isPunctureEvent]
    .map(isEventType =>
      bikeEvents.filter(isEventType).map(event => {
        const ride = activities?.find(
          ({start_date}) => event.date.toLocaleDateString() === new Date(start_date).toLocaleDateString()
        );

        return {
          name: ride ? extractEmoji(ride.name) : label(event.type),
          data: [
            {
              x: label(event.type),
              y: [event.date.getTime(), event.date.getTime()],
            },
          ],
        };
      })
    )
    .flat();

  const bikeCollection = labelCollection(relevantBikes, key => label(key, true));

  return (
    <>
      <Group width="full" justifyContent="end" gap="20px">
        <SegmentedControl size="sm" value={gearId} onValueChange={handleGearChange} items={bikeCollection.items} />
        <EditEvents onEditEvents={refreshEvents} />
      </Group>
      <Chart
        options={getOptions([], undefined, {
          xaxis: {type: 'datetime'},
          plotOptions: {
            bar: {
              horizontal: true,
              barHeight: '40%',
              rangeBarGroupRows: true,
              dataLabels: {hideOverflowingLabels: false},
            },
          },
          dataLabels: {
            enabled: true,
            formatter: (val: number[], opts) => (val[0] === val[1] ? opts.globals.seriesNames[opts.seriesIndex] : ''),
          },
          legend: {show: false},
        })}
        series={[...chainSeries, ...eventSeries, ...oneShotEventSeries]}
        type="rangeBar"
        height={450}
      />
    </>
  );
};

export {EventTimelineChart};
