import Chart from 'react-apexcharts';
import {Skeleton} from '../../components/ui';
import {useEvents, useLabels} from '../../hooks';
import {getOptions, ChainEvent, getNextEvent, isChainEvent, isBatteryEvent, isTireEvent} from '../../models';

const options: ApexCharts.ApexOptions = {
  xaxis: {type: 'datetime'},
  plotOptions: {
    bar: {
      horizontal: true,
      barHeight: '100%',
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
        event.date.getTime(),
        (getNextEvent(chainEvents, event, ({bike}) => event.bike === bike)?.date ?? new Date()).getTime(),
      ],
    })),
  }));

  const batteryEvents = events.filter(isBatteryEvent);
  const batterySerie = {
    name: label(batteryEvents[0].type),
    data: batteryEvents.map(event => ({
      x: label(event.type),
      y: [event.date.getTime(), (getNextEvent(batteryEvents, event)?.date ?? new Date()).getTime()],
    })),
  };

  const tireEvents = events.filter(isTireEvent);
  const tireSerie = {
    name: label(tireEvents[0].type),
    data: tireEvents.map(event => ({
      x: label(event.type),
      y: [event.date.getTime(), (getNextEvent(tireEvents, event)?.date ?? new Date()).getTime()],
    })),
  };

  return (
    <>
      <Chart
        options={getOptions([], undefined, options)}
        series={[...chainSeries, batterySerie, tireSerie]}
        type="rangeBar"
        height={400}
      />
    </>
  );
};

export {EventTimelineChart};
