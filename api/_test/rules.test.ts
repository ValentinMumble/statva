import {matchesRule, RideRule, ruleUpdate, RuledActivity} from '../_lib/rules.js';

// Google's polyline encoding, to give test rides a track.
const encode = (points: [number, number][]): string => {
  let previous = [0, 0];
  return points
    .map(point => {
      const chunk = point
        .map((value, axis) => {
          const rounded = Math.round(value * 1e5);
          let delta = rounded - previous[axis];
          previous[axis] = rounded;
          delta = delta < 0 ? ~(delta << 1) : delta << 1;
          let out = '';
          while (0x20 <= delta) {
            out += String.fromCharCode((0x20 | (delta & 0x1f)) + 63);
            delta >>= 5;
          }
          return out + String.fromCharCode(delta + 63);
        })
        .join('');
      previous = [...previous];
      return chunk;
    })
    .join('');
};

const HOME: [number, number] = [47.2306, -1.5518];
const OFFICE: [number, number] = [47.2112, -1.5757];
const AKENEO: RideRule = {
  name: 'Akeneo ⚙️',
  place: OFFICE,
  radiusM: 150,
  maxKm: 20,
  weekdaysOnly: true,
  commute: true,
  gearId: 'b13905696',
};

const ride = (fields: Partial<RuledActivity> = {}): RuledActivity => ({
  id: 1,
  name: 'Morning Ride',
  sport_type: 'Ride',
  distance: 9000,
  commute: false,
  gear_id: 'b13440652',
  // A Tuesday.
  start_date_local: '2026-10-13T09:00:00Z',
  map: {summary_polyline: encode([HOME, [47.22, -1.565], OFFICE, [47.22, -1.565], HOME])},
  ...fields,
});

describe('ride rules', () => {
  it('matches a short weekday ride that turns around at the place', () => {
    expect(matchesRule(ride(), AKENEO)).toBe(true);
  });

  it('leaves out long rides, weekends, runs and rides that stay away', () => {
    expect(matchesRule(ride({distance: 60000}), AKENEO)).toBe(false);
    expect(matchesRule(ride({start_date_local: '2026-10-11T09:00:00Z'}), AKENEO)).toBe(false);
    expect(matchesRule(ride({sport_type: 'Run'}), AKENEO)).toBe(false);
    expect(matchesRule(ride({map: {summary_polyline: encode([HOME, [47.25, -1.53], HOME])}}), AKENEO)).toBe(false);
  });

  it('leaves out a ride that only passes by and turns somewhere further', () => {
    expect(
      matchesRule(ride({map: {summary_polyline: encode([HOME, OFFICE, [47.195, -1.6], OFFICE, HOME])}}), AKENEO),
    ).toBe(false);
  });

  it('names it, flags it as a commute and puts it on the bike', () => {
    expect(ruleUpdate(ride(), [AKENEO])).toEqual({name: 'Akeneo ⚙️', commute: true, gear_id: 'b13905696'});
  });

  it('keeps a name the rider chose, and changes nothing already right', () => {
    expect(ruleUpdate(ride({name: 'Akeneo 💼'}), [AKENEO])).toEqual({commute: true, gear_id: 'b13905696'});
    expect(ruleUpdate(ride({name: 'Akeneo ⚙️', commute: true, gear_id: 'b13905696'}), [AKENEO])).toBeNull();
    expect(ruleUpdate(ride({distance: 60000}), [AKENEO])).toBeNull();
  });
});
