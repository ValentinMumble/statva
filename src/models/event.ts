type Event = {
  id: string;
  type: string;
  date: Date;
};

type ChainEvent = Event & {
  type: 'chain';
  chain: string;
  bike: string;
};

type TireEvent = Event & {
  type: 'tire';
  model: string;
  brand: string;
  width: number;
};

type BatteryEvent = Event & {
  type: 'battery';
};

type BrakePadEvent = Event & {
  type: 'brake_pad';
};

const getEventLabel = (event: Event): string => {
  if (isChainEvent(event)) {
    return event.chain;
  }

  if (isBatteryEvent(event)) {
    return '🔋';
  }

  if (isTireEvent(event)) {
    return `${event.brand} ${event.model} ${event.width}`;
  }

  if (isBrakePadEvent(event)) {
    return '🧇';
  }

  return event.id.substring(0, 4);
};

const isChainEvent = (event: Event): event is ChainEvent => 'chain' === event.type;
const isTireEvent = (event: Event): event is TireEvent => 'tire' === event.type;
const isBatteryEvent = (event: Event): event is BatteryEvent => 'battery' === event.type;
const isBrakePadEvent = (event: Event): event is BrakePadEvent => 'brake_pad' === event.type;

export {getEventLabel, isBatteryEvent, isChainEvent, isTireEvent, isBrakePadEvent};
export type {BatteryEvent, ChainEvent, TireEvent, Event, BrakePadEvent};
