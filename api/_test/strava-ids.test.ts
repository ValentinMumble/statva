import {isStravaId, newestFirst, parseStravaJson, withStringIds} from '../_lib/strava-ids.js';

describe('Strava ids', () => {
  it('keeps a 64-bit id whole, as a string', () => {
    expect(parseStravaJson('{"id": 18446744073709551615, "athlete": {"id": 42}}')).toEqual({
      id: '18446744073709551615',
      athlete: {id: '42'},
    });
  });

  it('turns the ids a webhook event, an upload or a comment points to into strings', () => {
    expect(
      parseStravaJson('{"object_id":9007199254740993,"owner_id":42,"activity_id":7,"upload_id":3,"elapsed_time":60}'),
    ).toEqual({object_id: '9007199254740993', owner_id: '42', activity_id: '7', upload_id: 3, elapsed_time: 60});
  });

  it('leaves texts, other numbers and ids that are strings already alone', () => {
    const text =
      '{"name": "Ride \\"id\\": 5", "id": 12, "map": {"id": "a12"}, "values": [{"id": 1.5}], "gear_id": "b1"}';

    expect(parseStravaJson(text)).toEqual({
      name: 'Ride "id": 5',
      id: '12',
      map: {id: 'a12'},
      values: [{id: 1.5}],
      gear_id: 'b1',
    });
  });

  it('gives data stored with number ids its ids as strings', () => {
    expect(withStringIds({1001: {id: 1001, name: 'Old ride', athlete: {id: 42}}})).toEqual({
      1001: {id: '1001', name: 'Old ride', athlete: {id: '42'}},
    });
    expect(withStringIds(null)).toBeNull();
  });

  it('orders ids from the newest without turning them into numbers', () => {
    expect(['999', '18446744073709551615', '18446744073709551614', '1000'].sort(newestFirst)).toEqual([
      '18446744073709551615',
      '18446744073709551614',
      '1000',
      '999',
    ]);
  });

  it('tells an id from anything else', () => {
    expect(isStravaId('18446744073709551615')).toBe(true);
    expect(['', '-1', '1.5', '12a', null, 12].map(isStravaId)).toEqual([false, false, false, false, false, false]);
  });
});
