import {buildActivity} from '../../test/test-util';
import {suggestName} from './naming';
import {ActivityType} from './strava';

const HOME = [47.2306, -1.5518];
const ride = (id: number, name: string, fields = {}) =>
  buildActivity({
    id,
    name,
    sport_type: ActivityType.Ride,
    distance: 9000,
    start_latlng: HOME,
    end_latlng: HOME,
    ...fields,
  });

describe('suggestName', () => {
  it('gives the name most often given to the same route', () => {
    const history = [
      ride(1, 'Akeneo ⚙️'),
      ride(2, 'Akeneo ⚙️'),
      ride(3, 'Akeneo 💼'),
      ride(4, 'Long one 🏔️', {distance: 90000}),
    ];

    expect(suggestName(ride(9, 'Morning Ride'), history, new Set())).toBe('Akeneo ⚙️');
  });

  it('adds an emoji not used yet when the route is new', () => {
    const name = suggestName(
      ride(9, 'Morning Ride', {start_latlng: [48.1, -1.6], end_latlng: [48.1, -1.6]}),
      [ride(1, 'Akeneo ⚙️')],
      new Set(),
    );

    expect(name.startsWith('Morning Ride ')).toBe(true);
    expect(name.length).toBeGreaterThan('Morning Ride '.length);
  });
});
