import {GetLabel} from './label';

type BaseEvent = {
  id: string;
  date: Date;
};

type ChainEvent = BaseEvent & {
  type: 'chain';
  chain: string;
  bike: string;
};

type CassetteEvent = BaseEvent & {
  type: 'cassette';
  brand: string;
  model: string;
  range: string;
};

type TireEvent = BaseEvent & {
  type: 'tire';
  model: string;
  brand: string;
  width: number;
};

type BatteryEvent = BaseEvent & {
  type: 'battery';
};

type BrakePadEvent = BaseEvent & {
  type: 'brake_pad';
};

type Event = ChainEvent | CassetteEvent | TireEvent | BatteryEvent | BrakePadEvent;

const getEventLabel = (event: Event, label: GetLabel): string => {
  switch (event.type) {
    case 'chain':
      return event.chain;
    case 'tire':
      return `${event.brand} ${event.model} ${event.width}`;
    case 'cassette':
      return `${event.brand} ${event.model} ${event.range}`;
    default:
      return label(event.type);
  }
};

const isChainEvent = (event: Event): event is ChainEvent => 'chain' === event.type;
const isCassetteEvent = (event: Event): event is CassetteEvent => 'cassette' === event.type;
const isTireEvent = (event: Event): event is TireEvent => 'tire' === event.type;
const isBatteryEvent = (event: Event): event is BatteryEvent => 'battery' === event.type;
const isBrakePadEvent = (event: Event): event is BrakePadEvent => 'brake_pad' === event.type;

export {getEventLabel, isBatteryEvent, isCassetteEvent, isChainEvent, isTireEvent, isBrakePadEvent};
export type {BatteryEvent, CassetteEvent, ChainEvent, TireEvent, Event, BrakePadEvent};
