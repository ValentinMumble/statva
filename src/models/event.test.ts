import {Event, BatteryEvent, BrakePadEvent, ChainEvent, getEventLabel, TireEvent} from './event';

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

const otherEvent: Event = {
  id: 'id1234',
  type: 'other',
  date: new Date(),
};

test('it can get the label from an event', () => {
  expect(getEventLabel(chainEvent)).toBe('🍓');
  expect(getEventLabel(tireEvent)).toBe('Continental GP5000 32');
  expect(getEventLabel(batteryEvent)).toBe('🔋');
  expect(getEventLabel(brakePadEvent)).toBe('🧇');
  expect(getEventLabel(otherEvent)).toBe('id12');
});
