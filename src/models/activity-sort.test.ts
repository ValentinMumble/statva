import {getActivity} from '../../test/test-util';
import {sortActivities} from './activity-sort';

const getFtp = () => 0;

test('it sorts two activities by date', async () => {
  expect(
    sortActivities(
      'date',
      'desc',
      getActivity({start_date: '2024-02-02'}),
      getActivity({start_date: '2023-02-02'}),
      getFtp
    )
  ).toBe(-1);

  expect(
    sortActivities(
      'date',
      'desc',
      getActivity({start_date: '2023-02-02'}),
      getActivity({start_date: '2024-02-02'}),
      getFtp
    )
  ).toBe(1);

  expect(
    sortActivities(
      'date',
      'asc',
      getActivity({start_date: '2023-02-02'}),
      getActivity({start_date: '2024-02-02'}),
      getFtp
    )
  ).toBe(-1);
});
