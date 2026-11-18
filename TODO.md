# TODO

What could come next. Shipped work lives in the git history, not here.

## From 4 January 2027

- [ ] Switch the Strava API address to `https://api-v3.strava.com` (in `api/_lib/strava.ts`
      and `scripts/`). Strava serves it from 4 January 2027.

## Blocked

- [ ] Search activities by the people they were with. Strava's API gives only
      `athlete_count`, and `/activities/{id}/related` now answers 401. Kudos names could
      be a noisy stand-in, or a people field filled by hand.
