import {getActivitySummaries} from './redis';
import {Activity} from '../models/strava';

// Three pages of the stored list, as the server sends them.
const PAGES = [
  {pages: 3, entries: {4: {id: 4}, 3: {id: 3}}},
  {pages: 3, entries: {2: {id: 2}}},
  {pages: 3, entries: {1: {id: 1}}},
];

test('shows each page as it arrives, then returns the whole list', async () => {
  global.fetch = (async (...[, init]: Parameters<typeof fetch>) =>
    new Response(JSON.stringify(PAGES[(JSON.parse(String(init?.body)) as {page: number}).page]))) as typeof fetch;
  const seen: number[] = [];

  const all = await getActivitySummaries((sofar: Activity[]) => seen.push(sofar.length));

  expect(seen).toEqual([2, 3]);
  expect(all.map(({id}) => id)).toEqual([1, 2, 3, 4]);
});
