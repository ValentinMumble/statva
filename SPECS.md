# Statva specs

Statva is a personal training log built on top of Strava. It reads your activities, adds
the things Strava does not track (bike parts, chain rotation, maintenance, FTP tests,
costs) and turns the lot into stats, charts and a dashboard.

This sheet describes what the app does today, feature by feature, and how each feature
should carry over to version 2. Version 2 is open source, lets each rider connect with
Strava, and has no personal values written into the code.

Legend for the **v2** notes:
- **Keep**: same behaviour.
- **Setting**: same behaviour, but the value written into the code today becomes a user setting.
- **Merge**: folded into another feature.
- **Drop**: not carried over.

---

## 1. Pages

| Page | Path | What it is for |
|---|---|---|
| Rides | `/` | The activity list, with stats, bike parts and charts beside it |
| Dashboard | `/dashboard` | A long read of all-time numbers, records and maps |
| Workshop | `/workshop` | Bike parts, maintenance history, logging events |
| Routes | `/routes/:id` | A Strava route on a map, with live check-ins |
| Check-in | `/check-in` | Drop your current position on a route and share the link |

Navigation is one bar with the four main pages and a **Log** button. On a phone the bar
sits at the bottom of the screen; on a computer it sits at the top.

v2: **Keep** the four pages. Add a **Settings** page and a **Connect with Strava** page.

---

## 2. Activities

### 2.1 Activity list
- Every activity, newest first, in a virtual list (only the visible rows are drawn, so a
  list of thousands stays fast).
- Each row shows: a sport icon, the weekday and day of month, the name (links to Strava,
  coloured by month), and one column per chosen metric.
- The icon changes for a KOM (crown), a commute (bus stop), a race and rides over 100 km.
- On a phone the metric columns are hidden and the row shows distance and moving time.
- Private activities are drawn faded.
- Hovering the average heart rate shows the time spent in each heart rate zone (fetched
  from Strava on demand).
- A notes button shows the activity description and first photo, and fetches the full
  activity details from Strava when they are not cached yet.

v2: **Keep**. Fetch the zones and full details on the server.

### 2.2 Metric columns
Any of these can be shown as a column and sorted on. The column header shows a total or
average over the filtered list.

| Metric | Cell | Header |
|---|---|---|
| Distance | km (m for swims) | sum |
| Climbing (D+) | m (laps for swims) | sum |
| Climbing ratio | D+ / distance | overall ratio |
| Moving time, elapsed time | h:mm | sum in days |
| Average speed | km/h, min/km for runs and hikes, min/100 m for swims | average |
| Max speed | km/h | max |
| Average, weighted and max power | W, coloured by power zone | average / max |
| Normalized power | W, read from the private note | average |
| Intensity | weighted power / FTP at that date | average |
| Average and max heart rate | bpm, coloured by heart rate zone | average / max |
| Suffer score | Strava relative effort | average |
| Training stress score (TSS) | from power, or from heart rate | average |
| Calories | kcal (estimated when Strava has none) | sum |
| Cadence, temperature | raw | average |
| PRs, achievements, kudos, photos | count | sum |
| Athletes | group size | average |

Default columns: cadence, heart rate, average speed, distance, D+, max speed, moving
time, normalized power, suffer score. The choice is remembered in the browser.

v2: **Keep**. Normalized power: **Setting** (where to read it from: computed from the
power stream, or parsed from the note with a pattern such as `NP: 245`).

### 2.3 Search and filters
- Search by name, without accents or case.
- Search by date in many forms: `2024-11-02`, `02/11/2024`, `november 2`, `2 nov`,
  `november 2024`, `2 november 2024`.
- Typing a search also shows private activities.
- Escape clears every filter.
- Filter by gear, by sport type (click to toggle, double click to keep only that one),
  bikes only, commutes (all, none, only), private on or off.
- A refresh button pulls the latest 30 activities from Strava.

v2: **Keep**. Gear filter accepts several gears (today only the first one counts).

### 2.4 Unprocessed activities
An activity whose name has no emoji is "unprocessed". These sit in their own section at
the top of the list, with a random unused emoji to copy (click to copy and roll a new
one) and a button to hide the row.

v2: **Setting** (on or off; most riders do not tag names with emojis).

---

## 3. Stats panel

### 3.1 This week
Training load (suffer score), active time and distance for this week, each compared with
the same days of last week (green up, red down), plus a sparkline of the training load
per day, week, month or year, with +/- to show more or fewer periods.

### 3.2 Per sport
A sport switch (ride, run, swim, tennis) shows a grid of stat cards:
- **Ride**: rides, distance, yearly goal progress ring, total D+, commute distance, days
  spent riding, average distance (no commutes), best average speed, FTP and W/kg,
  rides over 100 km and over 200 km, Eddington number with rides needed for the next one,
  and club stats (count, distance, average speed, average normalized power).
- **Run**: runs, distance, average distance, average suffer score, days spent running.
- **Swim**: sessions, distance, average distance, average suffer score, days swimming.
- **Tennis**: sessions, total time, average duration, average heart rate, suffer score.

v2: **Keep**. Sports shown: **Setting** (the sports the rider actually does). Yearly goal
(10 000 km today): **Setting**. Club name: **Setting**.

### 3.3 Week grid
The last 5 weeks (+ adds one), one row per week, one column per weekday. Each day shows
the icon of its longest activity, linked to Strava. A last column draws the weekly suffer
score as a funnel shape. Each week can be renamed in place (stored as a label).

v2: **Keep**.

---

## 4. Bike, parts and maintenance

### 4.1 Events
An event is something that happened to a bike on a date.

| Type | Extra fields | Wears out? |
|---|---|---|
| Chain | which chain (an id, emojis in practice) | yes, by stint |
| Cassette | brand, model, range | yes, summed over every fitting |
| Tire | brand, model, width | yes |
| Brake pads | none | yes |
| Brake bleed | none | yes, no limit |
| Battery | none | yes |
| Saddle | brand, model, width | no |
| Puncture | none | no, one-off |
| Fall | description | no, one-off |

### 4.2 Log flow
1. Pick what happened from a grid of 9 types.
2. Confirm. The date (today), the bike and the part are already filled in:
   - for a chain, the least used chain of the set is preselected, with its total km;
   - for tires, cassettes and saddles, the last 3 parts fitted are offered as chips
     ("fit the same as before"), with "something else" to type a new one.
3. A toast confirms with an **Undo** button.

On a phone the dialog opens from the bottom, with thumb-sized buttons.

v2: **Keep**. **Merge** the two older ways to add an event (inline row and the events
dialog in the timeline chart) into this one flow.

### 4.3 Parts panel
For the chosen bike, every wearing part with its distance since fitted against its
expected life, as a bar: green, amber from 80 %, red from 100 %, worst first.
- Expected life is a known limit where one is set (chain 400 km per stint, tire 8000 km,
  cassette 30 000 km summed over every time it was fitted), otherwise the average life of
  the previous parts of that type on that bike.
- Each part is a shortcut to log its replacement.

v2: **Keep**. Limits, due ratio, retired chains and retired bikes: **Setting**.

### 4.4 Charts
- **Chain rotation**: one bar per chain, split into stints, current chain in orange, the
  suggested next chain in green, a line for the average life of retired chains, and a
  header with km left before the current chain is due.
- **Part odometer**: per part type, distance or D+ per stint, current part highlighted.
- **Event timeline**: a Gantt chart of how long each part stayed on the bike, with falls
  and punctures as marks.

v2: **Keep**.

### 4.5 Workshop page
Parts panel, full event history (newest first, removable), backup to clipboard as JSON.

v2: **Keep**, plus export and import as a file.

---

## 5. Training

- **FTP tests**: date, weight, FTP. Added from a form. `FTP at date` is the latest test
  before that date. Chart of FTP and W/kg over time.
- **Training load**: fitness (CTL, 42-day average of daily TSS), fatigue (ATL, 7-day) and
  form (TSB = CTL - ATL) over the last 180 days.
- **TSS**: from weighted power and FTP when there is power; otherwise from heart rate
  (TRIMP), with max, resting and threshold heart rate.
- **Zones**: heart rate zones from fixed bpm thresholds; power zones as Coggan
  percentages of FTP.
- **Calories**: from kilojoules when Strava has them, otherwise estimated for runs and
  swims from duration, distance, heart rate and body weight.

v2: **Keep**. Max, resting and threshold heart rate, heart rate zones and body weight:
**Setting** (prefilled from Strava where it has them). Pick one FTP source (today the stat
card reads Strava's FTP while TSS reads the tests).

---

## 6. Charts (accordion on the Rides page)

Only open charts are drawn and loaded.

| Group | Charts |
|---|---|
| Gear | Chain rotation, part odometer, event timeline, distance / time / D+ per gear (pies), average speed per bike, cost per km |
| Volume | Distance, activities by sport, commute distance, commute speed, moving time, D+, calories, all per day, week, month or year |
| Effort | Suffer score per period, FTP, average heart rate and power for recent rides, suffer score and cadence per ride, training load |
| Eddington | Eddington number over time, days over each distance (with a range slider) |
| Club | Club rides per period, club speed and power, where club rides finished, club groups |
| Elsewhere | Pools (swims), courts (tennis), solo vs group rides |

v2: **Keep** the groups. The Club group appears only when a club name is set.
"Elsewhere" charts rely on naming habits (`Natation <pool>`, `Tennis <court>`): **Setting**
(a name pattern per chart), or **Drop**.

---

## 7. Costs

Expenses with date, amount (can be negative, for a sale) and description. The cost per
km chart shows the running cost per km and per hour on one bike, month by month, with
monthly spend as bars, and an option to skip the oldest part of the history.

v2: **Keep**. Which bike: **Setting** (today fixed to one bike). Link an expense to a
part so a part's cost per km can be shown (backlog idea).

---

## 8. Dashboard

Reads only the stored copy of the activities, never Strava, so it can be opened as
often as you like.

1. **Totals**: distance, time, climbing, activities, calories, kudos, work (MJ).
2. **Milestones**: rides over 100, 150, 200, 300 km; rides over 1000 m of climbing.
3. **Per year**: distance and climbing bars.
4. **Season pace**: cumulative km by week for the last 4 years.
5. **This year vs last year, to the same day**: activities, distance, climbing, time, kudos.
6. **Explorer map**: every track, the explored tiles (zoom 14, about 2.4 km wide), the
   biggest square of explored tiles, and the "yard" (the biggest connected group of tiles
   whose 4 neighbours are all explored, as Squadrats defines it).
7. **Latest photos**: 12, linked to their activity.
8. **Eddington**: days over each distance, days still needed for the next number, per year.
9. **Month by month**: a year by month heat grid.
10. **Fleet**: distance per gear, activities per sport.
11. **FTP over time**.
12. **When and how long**: start hour, weekday, ride length bands.
13. **Hall of fame** (top 3 each, ski excluded): longest, most climbing, hilliest,
    fastest, strongest (normalized power), hardest, most PRs, coldest, hottest, earliest
    start, most kudos, biggest group.
14. **Club**: rides per group, top finish places (parsed from notes).
15. **Maintenance and running costs**: events per type, spend, cost per km, PRs, KOMs,
    photos, rides with power, solo rides, commutes and CO2 not driven, indoor rides,
    weekday vs weekend split, median stop per ride, days out, longest streak, biggest
    week and month, Everests climbed, times around the Earth.
16. **Conditions**: average heart rate, temperature, recording devices.

v2: **Keep**. Map centre: **Setting**, defaulting to the centre of the
rider's tracks. Locale for dates and numbers (fr-FR today): **Setting**.

---

## 9. Routes

- **Routes**: pick one of your Strava routes; see it on a map with its distance, climbing
  and estimated time, and share a link that shows it to anyone.

v2: **Keep**. Check-ins (dropping your live position on a route for followers) are
**dropped**.

---

## 10. Labels

A key-to-text dictionary that renames anything: gear ids to bike names with emojis,
metric keys to header emojis, event types, sports, timeframes, weeks, pools, club groups.
Edited in a dialog; backup as JSON.

v2: **Keep**, as part of Settings. Ship sensible default labels so a new rider sees
emojis without setting anything.

---

## 11. Club detection

- A club ride is one whose name contains the club name.
- Its group is read from the name (`Club #670 C1`), unless a marker sits in the name,
  description or private note (for example 🏴‍☠️ or the word "pirate" for a Pirate group).
- The finish place is read from a note line `Finish au <place>`.
- Group rides (for the solo vs group chart) are rides with more than one athlete, races,
  names with given words, or descriptions with given tags.

v2: **Setting** for all of it: club name, group pattern, markers, finish pattern, group
words. Off by default.

---

## 12. Data

### 12.1 What comes from Strava

| Call | Used for | Cost |
|---|---|---|
| `GET /athlete` | Profile, FTP, weight, gear | 1 per session |
| `GET /athlete/activities` | The activity list | 1 per 200 activities |
| `GET /activities/{id}` | Description, private note, photos, calories, KOMs, device | 1 per activity |
| `GET /activities/{id}/zones` | Heart rate zones | 1 per hover |
| `GET /athletes/{id}/routes` | Routes | 1 per visit |

### 12.2 What Statva stores

| Data | Today (Upstash Redis hash) | v2 |
|---|---|---|
| Activity details | `activities` | per athlete |
| Events | `events` | per athlete |
| Labels | `labels` | per athlete, under Settings |
| FTP tests | `ftp_tests` | per athlete |
| Expenses | `expenses` | per athlete |
| Check-ins | `check_ins` | per athlete |
| Settings | (written into the code) | per athlete |
| Strava tokens | (a refresh token in the browser code) | per athlete, server only |

v2 stores the activity list too, so a page load does not page through Strava.

### 12.3 Scripts
- **Backfill**: fetch the details of every activity not stored yet, pacing itself on
  Strava's rate limit headers.
- **Check deleted**: find stored activities that no longer exist on Strava, write a report.
- **Remove deleted**: delete the activities listed in that report.

v2: **Merge** into the server: a webhook keeps the store up to date (see 13.2), and the
backfill runs as a background job that respects the shared limit.

---

## 13. Version 2 requirements

### 13.1 Security
- No secret in the browser. Strava client secret, tokens and the database token live on
  the server only (today all three ship in the page's JavaScript).
- No personal data in the build (today `public/local_*.json` is served publicly).
- The map tile token comes from the environment, limited to the app's domain.
- Each rider only ever sees their own data (also required by Strava's terms).

### 13.2 Connect with Strava
- Sign in with Strava (OAuth). The server swaps the code for tokens, stores them for that
  athlete, and refreshes them when they expire.
- A session cookie identifies the rider; every API route checks it.
- A Strava webhook tells the app when an activity is created, changed or deleted, so the
  app does not need to keep polling.
- Rate limit budget: the read limit is shared by the whole app (100 calls per 15 min and
  1000 per day by default; 200 and 2000 after the self-serve upgrade to 10 athletes). A
  full backfill costs one call per activity, so it must queue, pace itself, and fetch
  recent activities first.
- Disconnect: delete the rider's tokens and data.

### 13.3 Self-hosting
- Anyone can run their own copy with their own Strava app: a README with the steps,
  a `.env.example`, one click deploy to Vercel.
- A demo mode with made-up data, so the app can be tried without a Strava account and
  developed without touching real data.

### 13.4 Phones
- Bottom bar, one column at a time, thumb-sized buttons, no keyboard on open (as today).
- Installable as an app (manifest is already there).

### 13.5 Quality
- Every computation in `src/models` keeps its tests; add tests for TSS, tags and
  formatting, which have none today.
- Charts follow one palette (orange ramp for periods, a fixed series order).

---

## 14. Out of scope

- Showing one rider's data to another (forbidden by Strava's terms).
- Searching activities by the people you rode with (Strava's API does not expose them).
- Using Strava data for AI training (forbidden by Strava's terms).
