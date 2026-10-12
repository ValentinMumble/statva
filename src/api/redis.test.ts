import {getActivitySummaries} from './redis';
import {Activity} from '../models/strava';

// Three pages of the stored list, as the server sends them.
const PAGES = [
  {cursor: '7', entries: {1: {id: 1}, 2: {id: 2}}},
  {cursor: '9', entries: {3: {id: 3}}},
  {cursor: '0', entries: {4: {id: 4}}},
];

test('shows each page as it arrives, then returns the whole list', async () => {
  let call = 0;
  global.fetch = (async () => new Response(JSON.stringify(PAGES[call++]))) as typeof fetch;
  const seen: number[] = [];

  const all = await getActivitySummaries((sofar: Activity[]) => seen.push(sofar.length));

  expect(seen).toEqual([2, 3]);
  expect(all.map(({id}) => id)).toEqual([1, 2, 3, 4]);
});
