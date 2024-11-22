import {BatteryEvent, BrakePadEvent, CassetteEvent, ChainEvent, getEventLabel, TireEvent} from './event';

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

test('it can get the label from an event', () => {
  expect(getEventLabel(chainEvent, mockLabel)).toBe('🍓');
  expect(getEventLabel(tireEvent, mockLabel)).toBe('Continental GP5000 32');
  expect(getEventLabel(batteryEvent, mockLabel)).toBe('battery');
  expect(getEventLabel(brakePadEvent, mockLabel)).toBe('brake_pad');
  expect(getEventLabel(cassetteEvent, mockLabel)).toBe('SRAM Force AXS 10-33');
});
