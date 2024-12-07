import {BatteryEvent, BrakePadEvent, CassetteEvent, ChainEvent, getEventLabel, isEventValid, TireEvent} from './event';

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
  model: 'Force AXS',
  range: '10-33',
};

const mockLabel = (key: string | null) => key ?? '';

describe('getEventLabel', () => {
  test('it can get the label from an event', () => {
    expect(getEventLabel(chainEvent, mockLabel)).toEqual('🍓');
    expect(getEventLabel(tireEvent, mockLabel)).toEqual('Continental GP5000 32');
    expect(getEventLabel(batteryEvent, mockLabel)).toEqual('battery');
    expect(getEventLabel(brakePadEvent, mockLabel)).toEqual('brake_pad');
    expect(getEventLabel(cassetteEvent, mockLabel)).toEqual('SRAM Force AXS 10-33');
  });
});

describe('isEventValid', () => {
  test('it can tell if an event is valid', () => {
    expect(isEventValid(chainEvent)).toEqual(true);
    expect(isEventValid(tireEvent)).toEqual(true);
    expect(isEventValid(batteryEvent)).toEqual(true);
    expect(isEventValid(brakePadEvent)).toEqual(true);
    expect(isEventValid(cassetteEvent)).toEqual(true);
  });

  test('it can tell if an event is invalid', () => {
    expect(isEventValid({...chainEvent, chain: undefined})).toEqual(false);
    expect(isEventValid({...tireEvent, brand: undefined})).toEqual(false);
    expect(isEventValid({...batteryEvent, date: undefined})).toEqual(false);
    expect(isEventValid({...brakePadEvent, type: undefined})).toEqual(false);
    expect(isEventValid({...cassetteEvent, model: undefined})).toEqual(false);
  });
});
