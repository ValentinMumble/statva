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

const isEventValid = (event: Partial<Event>): boolean => {
  const hasTypeAndDate = undefined !== event.type && undefined !== event.date;

  switch (event.type) {
    case 'chain':
      return hasTypeAndDate && undefined !== event.chain && undefined !== event.bike;
    case 'cassette':
      return hasTypeAndDate && undefined !== event.brand && undefined !== event.model && undefined !== event.range;
    case 'tire':
      return hasTypeAndDate && undefined !== event.brand && undefined !== event.model && undefined !== event.width;
    case 'brake_pad':
    case 'battery':
    default:
      return hasTypeAndDate;
  }
};

const getNextEvent = <T extends Event>(events: T[], fromEvent: T, filter?: (event: T) => boolean): T | null => {
  if (filter) events = events.filter(filter);

  return events[events.indexOf(fromEvent) + 1] ?? null;
};

const isChainEvent = (event: Partial<Event>): event is ChainEvent => 'chain' === event.type;
const isCassetteEvent = (event: Partial<Event>): event is CassetteEvent => 'cassette' === event.type;
const isTireEvent = (event: Partial<Event>): event is TireEvent => 'tire' === event.type;
const isBatteryEvent = (event: Partial<Event>): event is BatteryEvent => 'battery' === event.type;
const isBrakePadEvent = (event: Partial<Event>): event is BrakePadEvent => 'brake_pad' === event.type;

export {
  getEventLabel,
  getNextEvent,
  isBatteryEvent,
  isCassetteEvent,
  isChainEvent,
  isEventValid,
  isTireEvent,
  isBrakePadEvent,
};
export type {BatteryEvent, CassetteEvent, ChainEvent, TireEvent, Event, BrakePadEvent};
