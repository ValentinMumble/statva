import {buildActivity} from '../../test/test-util';
import {shoeWear} from './shoes';

const now = new Date('2026-10-14T12:00:00Z');
const run = (gear: string, km: number, daysAgo: number) =>
  buildActivity({gear_id: gear, distance: km * 1000, start_date: new Date(now.getTime() - daysAgo * 86400000).toISOString()});

describe('shoeWear', () => {
  it('measures each pair against its life, most worn first, with the weeks left at the recent pace', () => {
    const runs = [run('g1', 300, 200), run('g1', 80, 10), run('g2', 650, 300)];
    const [worn, newer] = shoeWear(['g1', 'g2'], runs, 700, now);

    expect(worn).toMatchObject({id: 'g2', distance: 650000, weeksLeft: null});
    // 80 km over the last 8 weeks is 10 km a week, with 320 km to go.
    expect(newer).toMatchObject({id: 'g1', distance: 380000, weeksLeft: 32});
  });

  it('says a worn-out pair is due now', () => {
    expect(shoeWear(['g1'], [run('g1', 750, 5)], 700, now)[0].weeksLeft).toBe(0);
  });
});
