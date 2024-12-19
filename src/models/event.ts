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

type FallEvent = BaseEvent & {
  type: 'fall';
  bike: string;
};

type PunctureEvent = BaseEvent & {
  type: 'puncture';
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

type SaddleEvent = BaseEvent & {
  type: 'saddle';
  brand: string;
  model: string;
  width: number;
};

type Event =
  | ChainEvent
  | CassetteEvent
  | TireEvent
  | BatteryEvent
  | BrakePadEvent
  | SaddleEvent
  | FallEvent
  | PunctureEvent;

const getEventLabel = (event: Event, label: GetLabel, short: boolean = false): string => {
  switch (event.type) {
    case 'chain':
      return event.chain;
    case 'fall':
      return `${label(event.bike)} ${label(event.type)}`;
    case 'puncture':
      return `${label(event.bike)} ${label(event.type)}`;
    case 'tire':
      return `${short ? '' : event.brand} ${event.model} ${event.width}`.trim();
    case 'saddle':
      const [saddleMain] = event.model.split(' ');

      return `${event.brand} ${short ? saddleMain : event.model} ${short ? '' : event.width}`.trim();
    case 'cassette':
      const [cassetteMain] = event.model.split(' ');

      return `${event.brand} ${short ? cassetteMain : event.model} ${event.range}`.trim();
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
    case 'saddle':
      return hasTypeAndDate && undefined !== event.brand && undefined !== event.model && undefined !== event.width;
    case 'fall':
    case 'puncture':
      return hasTypeAndDate && undefined !== event.bike;
    default:
      return hasTypeAndDate;
  }
};

const getNextEvent = <T extends Event>(events: T[], fromEvent: T, filter?: (event: T) => boolean): T | null => {
  if (filter) events = events.filter(filter);

  return events[events.indexOf(fromEvent) + 1] ?? null;
};

//TODO useless?
const isChainEvent = (event: Partial<Event>): event is ChainEvent => 'chain' === event.type;
const isCassetteEvent = (event: Partial<Event>): event is CassetteEvent => 'cassette' === event.type;
const isTireEvent = (event: Partial<Event>): event is TireEvent => 'tire' === event.type;
const isBatteryEvent = (event: Partial<Event>): event is BatteryEvent => 'battery' === event.type;
const isBrakePadEvent = (event: Partial<Event>): event is BrakePadEvent => 'brake_pad' === event.type;
const isSaddleEvent = (event: Partial<Event>): event is SaddleEvent => 'saddle' === event.type;

export {
  getEventLabel,
  getNextEvent,
  isBatteryEvent,
  isBrakePadEvent,
  isCassetteEvent,
  isChainEvent,
  isEventValid,
  isSaddleEvent,
  isTireEvent,
};
export type {
  BatteryEvent,
  BrakePadEvent,
  CassetteEvent,
  ChainEvent,
  Event,
  FallEvent,
  PunctureEvent,
  SaddleEvent,
  TireEvent,
};
