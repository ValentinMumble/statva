# ✅ TODO

Next improvements for Statva. Newest ideas at the top; move to **Done** when shipped.

## Ideas / Backlog

- [ ] Search activities by the people they were with. **Blocked: no API for it.**
      Checked against a real group ride (3 athletes): the
      detailed activity only carries `athlete_count` and the owner's own
      `athlete.id`, with no participants anywhere in its 78 fields. The old
      `/activities/{id}/related` endpoint now answers 401 (internal only), so the
      "Other Athletes" list on strava.com is not reachable from the API.
      Possible routes if it is ever worth it: `/activities/{id}/kudos` does return
      names (truncated surnames) and could serve as a noisy proxy, or add a people
      field to the activity meta we already store and fill it by hand.
- [ ] Dashboard: best efforts and a power curve (best 1 km, 5 min, 20 min…). Needs the
      activity *streams*, which the cache does not hold: one more API call per ride,
      so roughly another day of Strava's 1000 daily reads to backfill.
- [ ] Dashboard: longest gap between rides. The cache is complete now, so the figure
      would be real time off rather than a hole in the archive.
- [ ] Merge odometer info into the event timeline (km labels or color intensity on the gantt bars)
- [ ] Cost per km per part (link expense price to part lifespans)
- [ ] Part wear gauges: km on the current part vs average life, with a km/weeks-left estimate

## In progress

### Version 2 (branch `v2`, built from `SPECS.md`)

v1 keeps running from `main` (release `v1.0.0`) until v2 replaces it.

- [x] **1. Data layer.** Live since 408a6dd; webhook subscription 376427. Every rider's data under their own Redis keys
      (`athlete:<id>:<name>`). Activity summaries stored on the server and kept up to
      date by a sync call (1 Strava call per visit instead of paging the whole list)
      and a Strava webhook. Activity details backfilled a few at a time within the
      shared rate limit. Settings stored per rider. A script copies the v1 data into
      the owner's keys.
- [x] **2. Demo mode.** Two years of made-up riding around Annecy (`src/demo/`), served
      from memory behind the same fetchers. "Try the demo" on the login screen; `npm run
      dev` uses it unless `VITE_REAL_DATA=1`. `dev-data/` is gone. Brought forward from
      phase 3: the default bike is a setting, gear comes from the Strava profile, and
      generic labels ship as defaults.
- [x] **3. Settings page.** Bikes, part limits, retired chains, goal, sports, body and
      heart rate, club rules, locale, map centre, notes, labels, export and disconnect.
      Heart rate, weight and NP-from-notes feed every calculation through `models/rider.ts`.
- [x] **4. New app** (`src/app/`): its own theme, a side menu or phone tab bar, and
      Home, Activities (with a detail page per activity), Bike, Stats, Records, Routes
      and Settings. Maps use keyless Esri tiles. The charts rebuilt last week are reused.
- [x] **4b. Finish the switch.** v1 screens gone; check-in and shared route pages rebuilt;
      no club, bike or athlete written into the code (tests use their own club rules).
- [ ] **5. Going public.** Done: README with self-hosting steps and a deploy button, an
      original icon, keyless maps, no personal values in the code, MIT licence, and a
      history with no `dev-data/`, `local_*.json` or map token (rewritten 2026-10-12;
      the full old history is in `../statva-history-backup-2026-10-12.bundle`). Left:
      GitHub Support must purge the two old pull request copies (`refs/pull/1`, `/2`)
      and cached commits; then make the repo public.

## Done

- [x] Phone layout: nav and Log in a bottom bar, the Log dialog as a bottom sheet with
  thumb-sized buttons, Rides and Overview as two views, each ride row showing its day,
  distance and time, and no keyboard popping up on open
- [x] Backfilled every Strava activity's details into the Redis cache: 1246 of 1246,
      2015 to today, in one day (961 of the 1000 daily reads). Re-run
      `node scripts/backfill-activities.mjs` any time to pick up new rides; it only
      fetches what is missing.

- [x] Dashboard, second pass from what VeloViewer, StatsHunters and Strava's Year in
      Sport show: milestone counters (100/150/200/300 km+, 1000 m+ days), this year
      against last year up to the same day, a wall of the latest ride photos,
      Eddington per season, commuting distance and CO₂ not driven, ride length
      bands, and the weekday/weekend split. Explorer tiles drawn on the route map from
      the full-resolution routes, with the max square outlined and the yard tinted,
      using Squadrats' definition: the biggest connected group of tiles that each have
      all four neighbours explored.

- [x] Dashboard at `/dashboard`, reading the Redis cache only (never Strava, so the
      rate limit cannot touch it). Totals, season pace year on year, month heatmap,
      the fleet, riding rhythm, FTP, a route heatmap with explorer tiles, Eddington
      with what the next level needs, a hall of fame of 12 records linking to
      Strava, N-Peloton groups and finish spots, workshop and running costs, heart
      rate and temperature. Ski stays out of the records.

- [x] `scripts/backfill-activities.mjs`: fills the activity cache from Strava,
      paced to 60 reads per 15 minutes so the app keeps working alongside it, and
      resumable. Plain JavaScript because `ts-node` cannot run TS in this ES module
      package any more.

- [x] Checked lazy loading: leave `lazy-charts.ts` as it is. Per-chart chunks are
      only 1–6 kB, so the win is deferring the shared `recharts` chunk (386 kB)
      until a chart accordion opens, which the current setup already does.

- [x] Drop ApexCharts: all 17 charts now use `@chakra-ui/charts` + recharts, one
      chart runtime instead of two. Shared pieces in `components/charts/ChartTooltip.tsx`
      and `models/chart-colors.ts`. `EventTimelineChart` was rebuilt as stacked
      floating bars (recharts has no range-bar type).

- [x] Search activities by date (e.g. `november 2`, `2 nov`, `2024-11-02`, `02/11/2024`)
- [x] Add cost/km chart with deletable expense list
