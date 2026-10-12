import {computeBikeParts, computeDashboard, computeExplorerTiles, decodePolyline, encodePolyline, suggestChains} from '../models';
import {generateDemo} from './generate';

const TODAY = new Date('2026-10-12T10:00:00Z');
const demo = generateDemo(TODAY);
const label = (key: string | null) => key ?? '';
const ROAD_BIKE = 'b9000001';

describe('demo data', () => {
  it('is the same every time for the same day', () => {
    const again = generateDemo(TODAY);

    expect(again.activities.map(({id, distance}) => [id, distance])).toEqual(demo.activities.map(({id, distance}) => [id, distance]));
    expect(again.events.length).toBe(demo.events.length);
  });

  it('covers two years up to today, newest first, with details for every activity', () => {
    const dates = demo.activities.map(({start_date}) => new Date(start_date).getTime());

    expect(dates).toEqual([...dates].sort((a, b) => b - a));
    expect(dates[0]).toBeLessThanOrEqual(TODAY.getTime() + 86400000);
    expect(dates.at(-1)).toBeLessThan(TODAY.getTime() - 700 * 86400000);
    expect(demo.activities.every(({id}) => undefined !== demo.details[id])).toBe(true);
  });

  it('rides a believable amount', () => {
    const rides = demo.activities.filter(({sport_type}) => sport_type.includes('Ride'));
    const kmPerYear = rides.reduce((total, {distance}) => total + distance, 0) / 1000 / 2;

    expect(kmPerYear).toBeGreaterThan(6000);
    expect(kmPerYear).toBeLessThan(12000);
    expect(new Set(demo.activities.map(({sport_type}) => sport_type))).toEqual(
      new Set(['Ride', 'GravelRide', 'VirtualRide', 'Run', 'Swim', 'Tennis']),
    );
  });

  it('draws tracks around Annecy that survive encoding', () => {
    const outdoor = demo.activities.find(({map}) => '' !== map.summary_polyline)!;
    const points = decodePolyline(demo.details[outdoor.id].map.polyline);

    expect(points.length).toBeGreaterThan(20);
    for (const [lat, lng] of points) {
      expect(Math.abs(lat - 45.9)).toBeLessThan(1);
      expect(Math.abs(lng - 6.13)).toBeLessThan(1.5);
    }
    expect(decodePolyline(encodePolyline([[45.89912, 6.12934], [45.9, 6.1301]]))).toEqual([[45.89912, 6.12934], [45.9, 6.1301]]);
  });

  it('keeps one ride without an emoji, to show the unprocessed list', () => {
    expect(demo.activities.filter(({name}) => 'Afternoon Ride' === name)).toHaveLength(1);
  });

  it('wears parts the way the parts panel expects', () => {
    const roadRides = demo.activities.filter(({gear_id}) => ROAD_BIKE === gear_id);
    const parts = computeBikeParts(demo.events, roadRides, ROAD_BIKE, label);
    const chain = parts.find(({type}) => 'chain' === type)!;

    expect(parts.map(({type}) => type)).toEqual(expect.arrayContaining(['chain', 'tire', 'cassette', 'brake_pad', 'battery']));
    expect(chain.distance).toBeLessThan(450 * 1000);
    expect(suggestChains(demo.events, roadRides, ROAD_BIKE).map(({chain}) => chain)).toHaveLength(2);
    expect(demo.events.filter(({type}) => 'fall' === type)).toHaveLength(1);
  });

  it('fills the dashboard and the explorer map', () => {
    const details = Object.values(demo.details);
    const dashboard = computeDashboard(details, demo.events, demo.ftpTests, demo.expenses, label);
    const tracks = details.map(({map}) => decodePolyline(map.polyline)).filter(track => 0 < track.length);
    const explorer = computeExplorerTiles(tracks);

    expect(dashboard.totals.eddington).toBeGreaterThan(40);
    expect(dashboard.records.length).toBeGreaterThan(5);
    expect(explorer.explored).toBeGreaterThan(200);
    expect(explorer.yard.length).toBeGreaterThan(10);
  });

  it('holds nothing from a real rider', () => {
    const everything = JSON.stringify(demo);

    expect(everything).not.toContain('11670816');
    expect(everything).not.toContain('b13440652');
    expect(everything).not.toContain('N-Peloton');
  });
});
