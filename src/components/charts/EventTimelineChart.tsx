import Chart from 'react-apexcharts';
import {Skeleton} from '../../components/ui';
import {useEvents, useLabels} from '../../hooks';
import {
  getOptions,
  ChainEvent,
  getNextEvent,
  isChainEvent,
  isBatteryEvent,
  isCassetteEvent,
  isBrakePadEvent,
  isTireEvent,
} from '../../models';

const EVENT_OFFSET = 42 * 3600 * 1000; // 36 hours

const options: ApexCharts.ApexOptions = {
  xaxis: {type: 'datetime'},
  plotOptions: {
    bar: {
      horizontal: true,
      barHeight: '40%',
      rangeBarGroupRows: true,
    },
  },
  legend: {show: false},
};

const EventTimelineChart = () => {
  const [label] = useLabels();
  const [events] = useEvents();

  if (null === events) {
    return <Skeleton height="200px" />;
  }

  const chainEvents = events.filter(isChainEvent);
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
        event.date.getTime() + EVENT_OFFSET,
        (getNextEvent(chainEvents, event, ({bike}) => event.bike === bike)?.date ?? new Date()).getTime(),
      ],
    })),
  }));

  //TODO tire display brand
  const eventSeries = [isBatteryEvent, isTireEvent, isCassetteEvent, isBrakePadEvent]
    .map(isEventType =>
      events.filter(isEventType).map(event => ({
        name: `${label(event.type)} ${event.date.toLocaleDateString()}`,
        data: [
          {
            x: label(event.type),
            y: [
              event.date.getTime() + EVENT_OFFSET,
              (getNextEvent(events.filter(isEventType), event)?.date ?? new Date()).getTime(),
            ],
          },
        ],
      }))
    )
    .flat();

  return (
    <>
      <Chart
        options={getOptions([], undefined, options)}
        series={[...chainSeries, ...eventSeries]}
        type="rangeBar"
        height={400}
      />
    </>
  );
};

export {EventTimelineChart};
