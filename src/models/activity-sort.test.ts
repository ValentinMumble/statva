import {buildActivity} from '../../test/test-util';
import {sortActivities} from './activity-sort';

const getFtp = () => 250;

test('it can sort activities by date', async () => {
  expect(
    sortActivities(
      'date',
      'desc',
      buildActivity({start_date: '2024-02-02'}),
      buildActivity({start_date: '2023-02-02'}),
      getFtp
    )
  ).toBe(-1);

  expect(
    sortActivities(
      'date',
      'desc',
      buildActivity({start_date: '2023-02-02'}),
      buildActivity({start_date: '2024-02-02'}),
      getFtp
    )
  ).toBe(1);

  expect(
    sortActivities(
      'date',
      'asc',
      buildActivity({start_date: '2023-02-02'}),
      buildActivity({start_date: '2024-02-02'}),
      getFtp
    )
  ).toBe(-1);
});
