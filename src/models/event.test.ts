import {
  BatteryEvent,
  BrakePadEvent,
  CassetteEvent,
  ChainEvent,
  getEventLabel,
  isEventValid,
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
};

const batteryEvent: BatteryEvent = {
  id: 'id',
  type: 'battery',
  date: new Date(),
};

const brakePadEvent: BrakePadEvent = {
  id: 'id',
  type: 'brake_pad',
  date: new Date(),
};

const cassetteEvent: CassetteEvent = {
  id: 'id',
  type: 'cassette',
  date: new Date(),
  brand: 'SRAM',
  model: 'Force AXS XG-1270',
  range: '10-33',
};

const saddleEvent: SaddleEvent = {
  id: 'id',
  type: 'saddle',
  date: new Date(),
  brand: 'S-Works',
  model: 'Romin EVO Mirror',
  width: 143,
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
    [{...chainEvent, chain: undefined}, false],
    [{...tireEvent, brand: undefined}, false],
    [{...batteryEvent, date: undefined}, false],
    [{...brakePadEvent, type: undefined}, false],
    [{...cassetteEvent, model: undefined}, false],
    [{...saddleEvent, width: undefined}, false],
  ])('it can tell if an event is valid', (event, expected) => {
    expect(isEventValid(event)).toEqual(expected);
  });
});
