# Statva specs

Statva is a personal training log built on top of Strava. It reads your activities, adds
the things Strava does not track (bike parts, chain rotation, maintenance, FTP tests,
costs) and turns the lot into a home page, stats and records.

It is open source. Each rider logs in with Strava and sees only their own data. Anything
personal (bikes, goals, heart rate, club) is a setting, not part of the code.

---

## 1. Pages and navigation

| Page | Path | What it is for |
|---|---|---|
| Home | `/` | This week, the latest activities, recent weeks, the most worn parts |
| Activities | `/activities` | Every activity in a searchable, sortable list |
| Activity | `/activities/:id` | One activity: map, figures, zones, photos, notes |
| Bike | `/bike/:bikeId?` | One bike's parts, history, charts and running costs |
| Stats | `/stats` | Totals per sport and period, and charts in tabs |
| Records | `/records` | All-time numbers, year in review, streaks, explorer map, hall of fame |
| Club | `/club` | Everything about the club rides (only with a club set, named after the club) |
| Settings | `/settings` | Settings, labels, export and disconnect |

Anyone not logged in sees a **Connect with Strava** screen with a way into the demo. When
a login fails, it says why (not on the allowed list, a scope unticked, access denied,
took too long).

On a computer, a sidebar holds the pages, **Refresh**, **Log an event** and the account
row (log out, or leave the demo). On a phone, a header shows the page title with Club,
Settings, Refresh and Log icons, and a floating tab bar in the style of iOS Liquid Glass (a frosted,
see-through capsule) holds Home, Activities, Bike, Stats and Records.

**Refresh** syncs with Strava now (11.3) and says "Up to date" or how many activities
came in. **Log** opens the event dialog (5.2). With the "no emoji" setting on (3.4),
Activities carries a count in the sidebar and a dot on the tab.

---

## 2. Home

1. **This week**: distance, time, climbing and training load (sum of Strava's suffer
   score) since Monday, each against the same days of last week (last week's total before
   anything is done), and one bar per day. "This week" is counted from when the activity
   list last changed, so a Refresh on a page left open since last week moves to this week.
2. **Latest**: the 6 newest activities with route shape, marks (private, race, 100 km+,
   KOM or Top 10 on a segment, no emoji), sport, day, kudos, first photo, normalized power
   coloured by zone, distance and time.
3. **Weeks**: the last 5 weeks (+4 on demand). Each day shows its longest activity, each
   week its distance and training load. A week can be renamed in place (stored as a label).
4. **Bike**: the main bike's distance and its 4 most worn parts, the chain always among
   them (in last place when it is not one of the most worn), with a button to log a
   change.
5. **Eddington**: the rides' Eddington number, this year's, and a bar of the days done
   toward the next one.

---

## 3. Activities

### 3.1 List
- Every stored activity in a virtual list (only the visible rows are drawn, so thousands
  stay fast), newest first by default.
- Each row: route shape (or sport icon), name, marks (race, 100 km+, KOM or Top 10 on a
  segment once the details are in), sport, day, gear, commute. Private activities are drawn
  faded.
- On a computer each chosen metric gets a column; on a phone a row shows distance and
  moving time.
- A row opens the Activity page. Coming back finds the same filters and scroll position.

### 3.2 Metric columns
Any of these can be a column and sorted on. The header shows a total or an average over
the filtered list. Columns that make no sense for a sport stay blank.

| Metric | Cell | Header |
|---|---|---|
| Distance | km (m for swims) | sum |
| Climbing (D+) | m (laps for swims) | sum |
| Climbing ratio | D+ / distance | overall ratio |
| Moving time, elapsed time | h:mm | sum in days |
| Average speed | km/h, min/km for runs and hikes, min/100 m for swims | average |
| Max speed | km/h | max |
| Average, weighted and max power | W | average / max |
| Normalized power | W, coloured by power zone | average |
| Intensity | normalized power / FTP at that date | average |
| Average and max heart rate | bpm, average coloured by heart rate zone | average / max |
| Suffer score | Strava's relative effort | average |
| Calories | kcal (estimated when Strava has none) | sum |
| Cadence, temperature | raw | average |
| PRs, achievements, kudos, photos | count | sum |
| Athletes | group size | average |

Default columns: cadence, average heart rate, average speed, distance, D+, max speed,
moving time, normalized power, suffer score. Headers are labels (emojis by default).

### 3.3 Search and filters
- Search by name, ignoring accents and case, or by date (`2024-11-02`, `02/11/2024`,
  `2 nov`, `nov 2024`, `2 november 2024`...). A search also looks through private
  activities. Escape clears it.
- **Sport groups** (All, Rides, Runs, Other) in one tap, and a **Sports** menu for any mix.
- **Gear**, **commutes** (all, none, only; computer only) and **device** (from the
  details; Records links here).
- A **private** toggle. When private activities match but are hidden, a card says how
  many and offers to show them.
- **Clear filters** appears as soon as a filter narrows the list.
- Search, gear, commutes, device and sort live in the address. The sports, the private
  toggle and the columns are remembered in the browser.

### 3.4 Activities without an emoji
For riders who tag names with an emoji (a setting, off by default). A card at the top
counts the activities whose name has none and lists the five newest, each with a name to
save on Strava: the name most often given to the same route (same start and end, about
the same length), or its own name with an emoji no name uses yet. Saving needs Strava
write access, which riders who logged in before Statva asked for it grant by logging in
again.

### 3.5 Merging activities
For a ride recorded in parts (a watch stopped and started again). **Merge** next to the
count turns the rows into checkboxes: pick 2 to 10 activities, then **Merge**. A dialog
lists the parts in time order with their total distance, moving time and the stops between
them, and asks for the name (the first part's), the bike or shoes and the commute flag
(the first part's too). Parts that overlap in time cannot be merged: they were recorded
twice, not in parts.

The server joins the parts' data streams (time, position, altitude, distance running on
from part to part, heart rate, cadence, power) into a TCX file and uploads it to Strava as
a new activity of the first part's sport, with the name, commute flag and the parts'
descriptions, then sets the gear. Strava's API cannot delete activities: the dialog lists
the parts with links to delete them on Strava. Kudos, comments and photos stay on the
parts; Strava works the segments out again.

Should Strava refuse the upload (as a duplicate of a part), Statva keeps the file and a
card on the Activities page says so: delete the parts, then **Upload again** (or **Forget
it**).

---

## 4. Activity page

- Back link to the list as it was left; date, name, and badges (gear, commute, private,
  KOM or top 10 trophy, number of riders). **Refresh** fetches it from Strava again; **Strava** opens it.
- On a commute, **Duplicate for today** copies the ride to today at the same time of day where
  it was ridden, for a commute ridden again the same way with nothing recorded: its data
  streams move to the new start and it goes up to Strava with its name, description, gear
  and commute flag, kept off followers' feeds, then opens. Not before that time has passed
  today: it would end in the future.
- The name has a pencil to rename it, and, when it has no emoji, a button that opens the
  editor with a suggested name (the name most given to the same route, or the name with an
  emoji not used yet). The gear badge is a menu to move a ride to
  another bike (or a run to other shoes, or to none; retired gear only when it is already
  on it). A commute shows a Commute badge and a private activity a Private badge, which
  cannot be changed here: Strava does not let apps change either. Both edits are saved on
  Strava, which needs write access (a login after Statva asked
  for it), and in the stored copies.
- **Map** of the full track (the summary track until the details are in).
- **Figures**: distance, times, climbing, speeds, average, weighted and normalized power
  (with power zone badges), intensity, average and max heart rate (with
  heart rate zone badges), cadence, calories, temperature, suffer score, kudos,
  achievements, PRs.
- **Photos**: all of them, fetched from Strava on open; one opens full size.
- **Comments**, when the activity has some: who wrote each and when, and a box to answer.
  Strava lets apps read comments but not post them, so the box copies the text and opens
  the activity on Strava to paste it there.
- **Notes**: the description and the private note, each with a pencil to change it (or
  write one), saved on Strava. When Strava answers but keeps a note as it was (apps may
  not be allowed to write it), nothing changes in Statva and the rider is told to edit it
  on Strava. **Heart rate zones** (time in each of
  Strava's zones) and **recorded with** (device, power meter or not).

---

## 5. Bike, parts and maintenance

### 5.1 Events
An event is something that happened to a bike on a date.

| Type | Extra fields | Wears out? |
|---|---|---|
| Chain | which chain (an id, emojis in practice) | yes, per stint |
| Cassette | brand, model, range | yes, summed over every stint |
| Tire | brand, model, width | yes |
| Brake pads, brake bleed, battery | none | yes |
| Saddle | brand, model, width | no |
| Puncture | none | no, one-off |
| Fall | description | no, one-off |

### 5.2 Log flow
1. Pick what happened from a grid of the 9 types (skipped when opened from a part).
2. Confirm. The date (today), the bike and the part are already filled in:
   - for a chain, the least used chain of the set is preselected (not the one on the
     bike, not retired ones), with each chain's total km;
   - for tires, cassettes and saddles, the last 3 parts fitted are offered as chips, with
     "Something else" to type a new one.
3. A toast confirms, with **Undo**.

On a phone the dialog opens from the bottom, with thumb-sized buttons.

### 5.3 Bike page
- A chip per bike, the main bike first (retired ones behind a toggle); figures for distance, this year, rides,
  events.
- **Parts**: every wearing part's distance since fitted against its expected life, as a
  bar (green, amber from 80 %, red from 100 %), most worn first, with the fitting date,
  weeks left at the pace of the last 8 weeks, cost per km when priced, and a **Replace**
  button. Below, the total wear cost per km.
- Expected life is the part's limit from the settings (by default chain 400 km per stint,
  tire 8000 km, cassette 30 000 km over all its stints), otherwise the average life of the
  earlier parts of that type on that bike.
- **History**: every event, newest first, grouped by month, each removable (with Undo).
- **Chain rotation**: one bar per chain split into stints, current chain in orange, next
  chain in green, km left before the current one is due, and a line at the average life
  of retired chains.
- **Parts, stint by stint**: distance or D+ per stint for each part type.
- **Timeline**: a Gantt chart of each part's time on the bike, with falls and punctures.
- **Running costs**, on the bike set for costs: cost per km and per hour month by month,
  monthly spend as bars, an option to skip the oldest months, and the expenses list.
- **Running shoes**: each pair in service, its km against how far a pair lasts (Settings,
  700 km by default), with weeks left at the pace of the last 8 weeks.
- **Tyre pressure**: front and rear in bar (psi underneath) from Frank Berto's 15 % tyre
  drop (fit: psi = 600 × wheel load in lb / width² + 0.75 × width − 25), on the total weight
  (rider, the bike's weight from Settings, kit) split 45 % front and 55 % rear, the width of
  the latest tire change ("28", or "30/32" for a front and a rear width), and 8 % lower for
  tubeless. Below 23 mm it warns the rule reads high. It lists those inputs for a
  cross-check on SILCA's calculator, and keeps the pressures the rider actually runs, in bar.

### 5.4 Costs
An expense has a date, an amount (negative for a sale) and a description. Part prices
(settings) give each part a cost per km over its expected life. A chain's limit is one
stint of a rotation, so its price is spread over what the retired chains on the bike did
in all; until one is retired, chains have no cost per km.

---

## 6. Stats

**Totals**: chips for All and each sport chosen in the settings, and a period (this year,
12 months, all time). It shows activities, distance, time, climbing, longest and average
speed. For rides it adds the Eddington number (with the days needed for the next one),
the club's rides, and the yearly goal: km done, a mark for today, and where the current
pace ends up.

**Charts**, in tabs (only the open tab is drawn):

| Tab | Charts |
|---|---|
| Training | Power curve by year, time in power zones week by week, threshold power (with a form to add an FTP test), aerobic fitness (normalized power per heartbeat), heart rate drift on long rides, heart rate and power per ride, suffer score per period and per ride, cadence per ride |
| Volume | Distance, activities by sport, moving time, climbing, calories, per day, week, month or year |
| Commutes | Routes (same name 3 times or more, with speeds and what a car would have cost), commute distance, commute speed |
| Running | Best times from 1 km to the marathon, year by year, from Strava's best efforts |
| Gear | Distance, time and climbing per gear, average speed per bike |
| Eddington | Eddington number over time, days over each distance |
| Other | Solo or in a group, swims per pool, tennis per court |

Pools and courts are read from activity names (`Natation <pool>`, `Tennis <court>`).

---

## 7. Records

Reads only the stored activity details, never Strava, so it can be opened as often as
you like. An activity whose details are not stored yet does not count.

1. **Totals**: distance, time, climbing, activities, calories, kudos, work (MJ).
2. **Milestones**: rides over 100, 150, 200 and 300 km, and over 1000 m of climbing.
3. **Year in review** (any year): totals, new explorer tiles, biggest day, longest ride,
   most used bike, best month, most kudos, top emojis, first and last activity.
4. **Per year**: distance and climbing. **Season pace**: cumulative km by week over 4
   years. **This year vs last year**, up to the same day.
5. **Where the wheels went**: every track on a map, the explorer tiles (zoom 14, about
   2.4 km wide), the biggest square of explored tiles, and the yard (the biggest connected
   group of tiles whose 4 neighbours are all explored, as Squadrats defines it).
6. **Latest photos**: 12, linked to their activity.
7. **Eddington**: days over each distance, days needed for the next number, per year.
   **More Eddingtons** (as VeloViewer counts them), each with what the next one needs:
   climbing (E days of at least 20 × E m), minutes (E days of at least E minutes ridden),
   kudos (VeloViewer's K-Index: E activities with at least E kudos) and riders (E rides
   with at least E riders, as Strava matched them). **Dark rides**: outdoor rides started
   before sunrise or still out after sunset where they started (sun times from the usual
   solar formulas), in all and this year, their share, and the latest.
8. **Month by month** grid, and a **calendar** of one square per day shaded by distance.
9. **When you ride** (weekday by hour) and **streaks** (longest and current runs of days
   and weeks, longest break).
10. **The fleet** (distance per gear, activities per sport), **threshold power** over
    time, **start hour**, **weekday**, **ride length**.
11. **Hall of fame** (top 3 each, skiing left out): longest, most climbing, hilliest,
    fastest, strongest (normalized power), hardest, most PRs, coldest, hottest, earliest
    start, most kudos, biggest group.
12. **Maintenance and running costs**: events per type, spend, cost per km, PRs, KOMs,
    photos, rides with power, solo rides, commutes and CO2 not driven, indoor rides,
    weekday vs weekend, typical stop, days out, biggest week and month,
    Everests climbed, times around the Earth.
13. **Conditions**: average heart rate, temperature, recording devices (a device opens
    the Activities list filtered on it).

---

## 8. Training calculations

- **FTP tests**: date, weight, FTP. The FTP at a date is the latest test before it.
- **Normalized power**: worked out on the server from the power stream the way Sauce for
  Strava does (one-second series, 30-second rolling average, stops left out, nothing
  under 5 minutes), only for rides with a power meter. A setting reads it from the
  private note instead (`NP: 245`) where the server has none.
- **Power analysis**, stored with the details: normalized power, best power over 10
  durations (5 s to 1 h), moving time in 25 W bands, and heart rate drift (power per
  heartbeat in the first half against the second, rides over an hour).
- **Intensity**: Statva's normalized power against the FTP of the day (Strava's weighted
  power until the normalized power is in), on rides only.
- **Zones**: heart rate zones from bpm thresholds in the settings; 7 power zones as
  Coggan percentages of FTP.
- **Calories**: from kilojoules when Strava has them, otherwise estimated for runs and
  swims from duration, distance, heart rate and body weight.
- **Training load** on Home is Strava's suffer score.

---

## 9. Settings

Stored settings sit on top of defaults, so a new rider sees a working app at once.
Changes are kept as a draft until **Save**.

| Section | Settings |
|---|---|
| Bikes | Main bike (default: Strava's primary bike), the bike running costs follow, retired bikes, each bike's weight and whether it runs tubeless, the weight of kit carried |
| Parts | Life limits (chain per stint, tires, cassette, brake pads, battery), prices (chain, tires, cassette, brake pads, brake fluid), retired chains, how far running shoes last |
| Ride rules | For recurring rides: where they turn around (and how close), the longest they are, weekdays only, then the name, commute flag and bike they get |
| Goal and sports | Yearly riding goal, car cost per km, the sports Stats shows |
| Body | Weight, heart rate zone thresholds |
| Club | On or off, club name, the club's website, groups marked by emojis or words, other group-ride words |
| Display | Language for dates and numbers, where maps open, normalized power from notes, point out activities without an emoji |
| Labels | Add, change or remove labels |
| Account | Export my data (JSON of settings, labels, events, expenses, FTP tests), leave the demo, disconnect from Strava (deletes everything Statva holds) |

**Labels** are a key-to-text dictionary that renames anything: gear, metric keys, event
types, sports, periods, weeks, pools. The rider's labels win over gear names from Strava,
which win over built-in defaults (emojis for columns, parts, sports and periods).

---

## 10. Club detection

Off until the rider sets a club.

- A club ride is one whose name contains the club name.
- Its group is read from the name (`Club #42 C1`), unless a group's marker sits in the
  name, description or private note (for example 🏴‍☠️ or the word "pirate" for a Pirate
  group).
- The finish place is read from a note line starting with `Finish`.
- A group ride (solo vs group chart) has more than one athlete, is a race, or has one of
  the group words in its name.
- The session number is the `#672` in the name: the club's own count of sessions.

### 10.1 Club page
Named after the club, with a link to the club's site when one is set, the month of the
first session and the usual weekday. It waits for the whole activity list before showing
figures.

**The club's calendar.** When the club's website is its team page on pedalons.fr
(`https://www.pedalons.fr/equipes/<team>`), the server reads the team's published rides
(number, local day, groups out, finish place) from the site's public API, the whole history
in a few pages of 200, and keeps them, reading them again at most every 6 hours. Posts,
drafts and deleted rides are left out. A series written under the club's initials
("NP #411") or in another case ("RAYMOND RIDE #42") counts as the same series. A ride
counts as ridden when a session has its number, or else falls on its day. No other site
is ever read. When the calendar lists other numbered rides the rider has done too (the
Sunday "Raymond Ride"), a switch at the top shows the whole page for either series.

- **Figures**: sessions ridden of those held since the first one (from the calendar;
  without it, from the session numbers), km and the share of all riding km, climbing,
  time, and the sessions and km of this year.
- **Attendance**: the current and longest run of weeks in a row with a session (this
  week does not break the current run until it is over), sessions missed of the last 8
  held, and a strip with one cell per week, a row per year, each filled cell opening its
  session. With the calendar, a week without any session held is outlined and neither
  breaks a run nor counts as missed.
- **Missed sessions**: from the calendar, the latest 8 (or all), with their day, finish
  bar and groups out.
- **Sessions**: the latest 8, with their route, group, finish place (from the notes, or
  else the calendar), riders, km and speed, and a link to all of them in the activities
  list, searched by the series' name.
- **Groups**: sessions, average riders, speed and power (rides with a power meter).
- **Bikes**: for each bike ridden to the club, its sessions, km, years used, average
  speed and power, and a bar for its share of the sessions.
- **Group size**: riders Strava matched on the same ride (1 counts as unknown), on
  average, the biggest ride, and month by month over the years.
- **Session records**: fastest, longest, hilliest, most power, hardest, most kudos,
  coldest, hottest, each opening its ride; PRs, achievements, kudos and photos in all.
- **Where it finished**: the 10 most visited finish places, from the notes or else the
  calendar, spellings of one place counted together ("Caf'K" and "CafK").
- **Routes**: every session's track on one map, with the 5 most used starts sized by use.
- **Charts**: sessions per period, speed and power, heart rate and power.

---

## 11. Server and data

### 11.1 Server routes
Serverless functions in `api/`: 7 of the 12 the Hobby plan takes per deployment (a test
fails above 12), so related routes share one. `api/auth.ts` answers every `/api/auth/<step>`
(vercel.json rewrites it to `?step=`), `api/sync.ts` also backfills, and `api/activity.ts`
also merges and copies. All but login, callback and the webhook need a session.

| Route | Does |
|---|---|
| `GET /api/auth/login`, `/callback` | Strava OAuth: consent page, then code for tokens and session cookie |
| `GET /api/auth/me`, `/logout` | Logged in or not; clear the cookie |
| `POST /api/auth/disconnect` | Revoke access on Strava, delete the rider's data and tokens |
| `GET /api/strava` | Call Strava for the rider, on a short list of allowed paths |
| `POST /api/store` | Read and write the rider's own data |
| `POST /api/sync` | Bring the rider's stored activities up to date, quickly |
| `POST /api/sync?step=backfill` | Fill in the details and power data of a few older activities |
| `POST /api/activity?id=` | Fetch one activity again and store it |
| `POST /api/activity?action=copy&id=` | Copy a ride to today at the same time of day, on Strava and in Statva (4) |
| `GET, POST, DELETE /api/activity?action=merge` | Merge activities into a new one on Strava (3.5); the merge Strava refused, uploaded again or forgotten |
| `GET /api/club` | The club's calendar from its team on pedalons.fr, read again at most every 6 hours |
| `PUT /api/activity?id=` | Rename an activity, move it to other gear, or change its description or private note, on Strava and in Statva (422 when Strava keeps a field as it was) |
| `GET, POST /api/webhook` | Strava's subscription check, and its events |

### 11.2 What comes from Strava

| Call | Used for | Cost |
|---|---|---|
| `GET /athlete` | Name, gear | 1 per visit |
| `GET /athlete/activities` | The activity list | 1 per 200 activities for the history, then 1 per sync |
| `GET /activities/{id}` | Details: notes, photo, calories, KOMs, device, full track | 1 per activity, again on a webhook event or Refresh |
| `GET /activities/{id}/streams` | Power analysis, merges, copies | 1 per activity with a power meter, 1 per merged part or copy |
| `POST /uploads`, `GET /uploads/{id}` | Merges, copies | 1 upload and a few status checks each |
| `GET /activities/{id}/zones`, `/photos` | Activity page | 1 each per page open |

### 11.3 Sync
- The app syncs on every visit and on Refresh. The first syncs page through the whole
  history, a few pages per call, and the list fills up after each. After that a sync
  fetches what started since the newest known activity, minus a month for late uploads.
  The app then reloads the newest 20 stored activities, which also takes out of the list
  the ones among them deleted on Strava (the webhook removes them from the store).
- A sync also fetches the details of the activities that are new (up to 10), and answers.
  The app then puts just those details into what it has loaded, rather than reloading all,
  and reads the newest 20 stored activities, so one the webhook stored before the sync
  (which then finds nothing new) still shows at once.
- After each sync the app asks for a backfill without waiting for it: the details of a
  few older activities (newest first) and the power data of a few that lack it. Its
  details are merged in the same way when it ends.
- Strava's read limit is shared by every rider of the app (100 calls per 15 minutes and
  1000 a day, twice that after the upgrade to 10 athletes). The server records the usage
  Strava reports; the details and power backfill stop at half of either window, which
  leaves the rest for visits and the webhook.

### 11.4 Webhook
Strava calls it when an activity is created, changed or deleted, and when a rider
disconnects. These calls are not signed, so nothing trusts the event: other athletes are
ignored, an activity event fetches the activity again (removed if Strava answers 404),
and a disconnect is checked with Strava before anything is deleted.

On a new activity (and on one a sync brings in after the history is in), the rider's ride
rules apply: a pedalled ride, short enough, on a weekday if asked, whose farthest point
from its start is by the rule's place, gets the rule's name (only if its own has no
emoji), the commute flag and the bike, on Strava and in Statva. Only then, so a change
made on Strava later is never undone. Strava does not let apps change the commute flag, so
that part is left out where Strava keeps it; what it takes (name, bike) is stored. A merge
Statva uploaded (a merge, 3.5, or a copy, 4) is left as the rider set it up.

### 11.5 What Statva stores
Upstash Redis hashes. Each rider's data sits under `athlete:<id>:<name>`. The store route
adds that prefix itself, so no request can reach another rider's data or the tokens.

| Name | Holds | Written by |
|---|---|---|
| `activities` | Summaries for the list (no notes, photos or full track) | server |
| `details` | Full activities, cut down (no splits or laps, segment efforts reduced to the KOM rank), with the power analysis | server |
| `sync` | History progress and the newest start time | server |
| `power` | Activities whose power is worked out (0 without a power meter) | server |
| `club` | The club's calendar read from its website, and when it was read | server |
| `events`, `labels`, `ftp_tests`, `expenses`, `settings` | What the rider enters | rider |
| `merge` | A merge Strava refused, with its file, until uploaded again or forgotten | server, never read by the browser |

The rider can read every name but `merge`, and write only their own five. Shared keys:
`strava_tokens` (every rider's tokens, never reachable from the browser) and
`strava:usage` (the app's rate limit usage).

### 11.6 Scripts
Run with `node` from the repo root, reading `.env.local`, for the first athlete in
`STRAVA_ATHLETE_IDS` (log in once first).

- **webhook-subscribe**: registers the webhook with Strava, or shows the current one.
- **prune-deleted-activities**: lists stored activities gone from Strava (deleted while the
  webhook was not set up or missed), and removes them with `--remove`.
- **reupload-device**: uploads rides again under another recording device, since Strava
  cannot change it (prepare, delete the originals on Strava, upload).

None is needed to run the app: the server fills in details and power data on its own.

---

## 12. Demo mode

Two years of made-up riding with bikes, parts, FTP tests, expenses and a club. Dates follow
today and the same day gives the same data. A stand-in for the server answers from memory,
so anything logged lasts until a reload. Visitors enter it from the login screen; local
development runs on it unless `VITE_REAL_DATA=1` (then `vercel dev` serves the API).

---

## 13. Requirements

### 13.1 Security
- No secret in the browser: the Strava client secret, the tokens, the session secret and
  the database token are server-only settings (no `VITE_` prefix).
- No personal data in the code or the build. Map tiles need no token.
- Each rider only ever sees their own data (also required by Strava's terms).

### 13.2 Login
- Sign in with Strava, asking for `activity:read_all` (private activities) and
  `profile:read_all` (gear). A state cookie ties the answer to the browser, and every
  scope must be granted.
- Only athletes in `STRAVA_ATHLETE_IDS` may log in. A refused athlete has their access
  handed back to Strava at once and nothing is stored.
- The session cookie holds the athlete id and an expiry, signed with `SESSION_SECRET`.
  It lasts 30 days and is HttpOnly, Secure, SameSite=Lax.
- Tokens are refreshed on the server before they expire.
- Disconnecting, from Settings or on Strava's side, deletes the rider's tokens and data.

### 13.3 Self-hosting
- Anyone can run a copy with their own Strava app: a README with the steps, a
  `.env.example`, a one-click deploy to Vercel, Upstash Redis from Vercel's storage.
- The demo lets anyone try the app without an account, and develop without real data.

### 13.4 Phones
- Floating tab bar, one column at a time, thumb-sized buttons, dialogs from the bottom,
  pages kept clear of the notch and the home indicator.
- Installable as an app (web manifest).

### 13.5 Quality
- Every calculation lives in `src/models` with tests, except the column formatting
  (`tag.ts`). The server has tests for login, the Strava proxy, sync, the store, the
  webhook and power.
- Charts follow one palette (orange ramp for periods, a fixed series order).
- Code is laid out by Prettier, with the same settings as the other personal projects
  (chords, hk): `npm run lint` fails on a file it would change, `npm run format` fixes it.

---

## 14. Out of scope

- Showing one rider's data to another (forbidden by Strava's terms).
- Searching activities by the people you rode with (Strava's API does not expose them).
- Using Strava data for AI training (forbidden by Strava's terms).
