# TODO

What could come next. Shipped work lives in the git history, not here.

## From 4 January 2027

- [ ] Switch the Strava API address to `https://api-v3.strava.com` (in `api/_lib/strava.ts`
      and `scripts/`). Strava serves it from 4 January 2027.
- [ ] Read activity and athlete ids from Strava's `id_str` text field instead of `id`, before
      1 June 2027, when ids may grow past what a JavaScript number holds. This touches the
      types, the server (`api/strava.ts` compares the athlete id as a number), the stored data
      (old activities keep a number id) and the demo.

## Blocked

- [ ] Search activities by the people they were with. Strava's API gives only
      `athlete_count`, and `/activities/{id}/related` now answers 401. Kudos names could
      be a noisy stand-in, or a people field filled by hand.
