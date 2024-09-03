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
  tire: string;
};

type BatteryEvent = Event & {
  type: 'battery';
};

const isChainEvent = (event: Event): event is ChainEvent => 'chain' === event.type;
const isTireEvent = (event: Event): event is TireEvent => 'tire' === event.type;
const isBatteryEvent = (event: Event): event is BatteryEvent => 'battery' === event.type;

export {isBatteryEvent, isChainEvent, isTireEvent};
export type {BatteryEvent, ChainEvent, TireEvent, Event};
