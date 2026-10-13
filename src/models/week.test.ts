import {routeShape} from './route-shape';
import {weekSummary} from './week';
import {Activity} from './strava';

const ride = (start: string, km: number, load = 50) =>
  ({start_date: start, distance: km * 1000, moving_time: km * 120, total_elevation_gain: km * 10, suffer_score: load}) as Activity;

describe('weekSummary', () => {
  // A Wednesday afternoon.
  const now = new Date(2026, 9, 14, 15, 0);
  const activities = [
    ride(new Date(2026, 9, 12, 8).toISOString(), 30),
    ride(new Date(2026, 9, 14, 9).toISOString(), 50),
    ride(new Date(2026, 9, 5, 8).toISOString(), 20),
    ride(new Date(2026, 9, 7, 18).toISOString(), 40),
    ride(new Date(2026, 9, 8, 9).toISOString(), 100),
  ];

  it('counts this week from Monday to now', () => {
    expect(weekSummary(activities, now).current).toMatchObject({count: 2, distance: 80000, load: 100});
  });

  it('compares with the same span of last week, not the whole week', () => {
    expect(weekSummary(activities, now).previous).toMatchObject({count: 1, distance: 20000});
  });

  it('counts each sport, most first', () => {
    const withRun = [...activities, {...ride(new Date(2026, 9, 13, 7).toISOString(), 10), sport_type: 'Run'} as Activity].map((activity, index) =>
      activity.sport_type ? activity : ({...activity, sport_type: 'Ride', commute: 0 === index} as Activity),
    );

    expect(weekSummary(withRun, now).current.bySport).toEqual([
      {sport: 'Ride', count: 2, commutes: 1},
      {sport: 'Run', count: 1, commutes: 0},
    ]);
  });

  it('keeps last week whole too', () => {
    expect(weekSummary(activities, now).lastWeek).toMatchObject({count: 3, distance: 160000});
  });

  it('lists the seven days of this week', () => {
    const {days} = weekSummary(activities, now);

    expect(days.map(({distance}) => distance / 1000)).toEqual([30, 0, 50, 0, 0, 0, 0]);
    expect(days[0].date.getDay()).toBe(1);
  });
});

describe('routeShape', () => {
  it('fits a track in the square and keeps its proportions', () => {
    const shape = routeShape([[45.9, 6.1], [45.95, 6.1], [45.95, 6.2]], 100, 0)!;
    const coordinates = shape.path.match(/-?\d+(\.\d+)?/g)!.map(Number);

    expect(Math.min(...coordinates)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...coordinates)).toBeLessThanOrEqual(100);
    expect(shape.start[1]).toBeGreaterThan(shape.end[1]);
  });

  it('draws nothing for less than two points', () => {
    expect(routeShape([[45.9, 6.1]], 100)).toBeNull();
  });
});
