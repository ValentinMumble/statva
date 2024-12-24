import {
  BatteryEvent,
  BrakePadEvent,
  CassetteEvent,
  ChainEvent,
  FallEvent,
  getEventLabel,
  isEventValid,
  PunctureEvent,
  SaddleEvent,
  TireEvent,
} from './event';

const chainEvent: ChainEvent = {
  id: 'id',
  type: 'chain',
  date: new Date(),
  bike: 'bikeId',
  chain: '🍓',
};

const tireEvent: TireEvent = {
  id: 'id',
  type: 'tire',
  date: new Date(),
  brand: 'Continental',
  model: 'GP5000',
  width: 32,
  bike: 'bikeId',
};

const batteryEvent: BatteryEvent = {
  id: 'id',
  type: 'battery',
  date: new Date(),
  bike: 'bikeId',
};

const brakePadEvent: BrakePadEvent = {
  id: 'id',
  type: 'brake_pad',
  date: new Date(),
  bike: 'bikeId',
};

const cassetteEvent: CassetteEvent = {
  id: 'id',
  type: 'cassette',
  date: new Date(),
  brand: 'SRAM',
  model: 'Force AXS XG-1270',
  range: '10-33',
  bike: 'bikeId',
};

const saddleEvent: SaddleEvent = {
  id: 'id',
  type: 'saddle',
  date: new Date(),
  brand: 'S-Works',
  model: 'Romin EVO Mirror',
  width: 143,
  bike: 'bikeId',
};

const punctureEvent: PunctureEvent = {
  id: 'id',
  type: 'puncture',
  date: new Date(),
  bike: 'bikeId',
};

const fallEvent: FallEvent = {
  id: 'id',
  type: 'fall',
  date: new Date(),
  bike: 'bikeId',
  description: 'I fell off my bike',
};

const mockLabel = (key: string | null) => key ?? '';

describe('getEventLabel', () => {
  test.each([
    [chainEvent, '🍓'],
    [tireEvent, 'Continental GP5000 32'],
    [batteryEvent, 'battery'],
    [brakePadEvent, 'brake_pad'],
    [cassetteEvent, 'SRAM Force AXS XG-1270 10-33'],
    [saddleEvent, 'S-Works Romin EVO Mirror 143'],
    [punctureEvent, 'bikeId puncture'],
    [fallEvent, 'bikeId fall'],
  ])('it can get the label from an event', (event, expected) => {
    expect(getEventLabel(event, mockLabel)).toEqual(expected);
  });

  test.each([
    [tireEvent, 'GP5000 32'],
    [cassetteEvent, 'SRAM Force 10-33'],
    [saddleEvent, 'S-Works Romin'],
  ])('it can get the event label in a short version', (event, expected) => {
    expect(getEventLabel(event, mockLabel, true)).toEqual(expected);
  });
});

describe('isEventValid', () => {
  test.each([
    [chainEvent, true],
    [tireEvent, true],
    [batteryEvent, true],
    [brakePadEvent, true],
    [cassetteEvent, true],
    [saddleEvent, true],
    [punctureEvent, true],
    [fallEvent, true],
    [{...chainEvent, chain: undefined}, false],
    [{...tireEvent, brand: undefined}, false],
    [{...batteryEvent, date: undefined}, false],
    [{...brakePadEvent, type: undefined}, false],
    [{...cassetteEvent, model: undefined}, false],
    [{...saddleEvent, width: undefined}, false],
    [{...punctureEvent, bike: undefined}, false],
    [{...fallEvent, date: undefined}, false],
  ])('it can tell if an event is valid', (event, expected) => {
    expect(isEventValid(event)).toEqual(expected);
  });
});
