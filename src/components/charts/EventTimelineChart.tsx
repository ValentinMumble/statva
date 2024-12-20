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
  getEventLabel,
  isSaddleEvent,
  isFallEvent,
  isPunctureEvent,
} from '../../models';

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
        event.date.getTime(),
        (getNextEvent(chainEvents, event, ({bike}) => event.bike === bike)?.date ?? new Date()).getTime(),
      ],
    })),
  }));

  const eventSeries = [isBatteryEvent, isTireEvent, isCassetteEvent, isBrakePadEvent, isSaddleEvent]
    .map(isEventType =>
      events.filter(isEventType).map(event => ({
        name: getEventLabel(event, label),
        data: [
          {
            x: label(event.type),
            y: [event.date.getTime(), (getNextEvent(events.filter(isEventType), event)?.date ?? new Date()).getTime()],
          },
        ],
      }))
    )
    .flat();

  const oneShotEventSeries = [isFallEvent, isPunctureEvent]
    .map(isEventType =>
      events.filter(isEventType).map(event => ({
        name: label(isEventType(event) ? event.bike : event.type, true),
        data: [
          {
            x: label(event.type),
            y: [event.date.getTime(), event.date.getTime()],
          },
        ],
      }))
    )
    .flat();

  return (
    <>
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
