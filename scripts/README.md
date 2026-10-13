# Scripts

One-off jobs for the app's owner. The server keeps activities up to date on its own (sync
on every visit, Strava's webhook, and details and power data filled in a few at a time),
so none of these is needed to run Statva.

Run them from the repo root with `node`. They are plain JavaScript with no build step, and
share `env.mjs`, which reads `.env.local` then `.env` and stops with a clear message if a
setting is missing:

```
STRAVA_CLIENT_ID=...
STRAVA_CLIENT_SECRET=...
STRAVA_ATHLETE_IDS=...
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
```

They act for the first athlete in `STRAVA_ATHLETE_IDS`, with the Strava token the app
stored when that athlete logged in, so log in to the app once before running them.

## webhook-subscribe.mjs

Registers Statva's webhook with Strava, so new, edited and deleted activities reach the app
without a visit. Without an address, it shows the current subscription.

```bash
node scripts/webhook-subscribe.mjs https://your-domain
```

## prune-deleted-activities.mjs

Finds activities Statva still stores that are gone from Strava, for ones deleted while the
webhook was not set up or did not get through. It changes nothing unless asked to.

```bash
node scripts/prune-deleted-activities.mjs            # list them
node scripts/prune-deleted-activities.mjs --remove   # and remove them
```

## reupload-device.mjs

Uploads activities again under another recording device, since Strava cannot change the
device of an activity. It rebuilds each ride from its data into the file format Strava
recognises the new device from, so it knows only the devices listed in its `DEVICES`
table (MyWhoosh and Apple Watch Series 10 for now), plus `none` to leave the activity
without a device. `--from` takes the device name exactly as Strava shows it. The rides
keep their name, description, sport, gear and indoor flag, and are muted. Photos have to
be added back by hand from each ride's folder.

```bash
node scripts/reupload-device.mjs --prepare --from "Garmin Edge 1030 Plus" --to MyWhoosh   # read only
node scripts/reupload-device.mjs --upload                                                # after you delete the originals
```

`--prepare` saves each ride in `~/Downloads/statva-reupload`. Strava refuses a copy while
the original exists and the API cannot delete activities, so you delete the originals on
Strava, then `--upload` sends every ride whose original is gone. It asks you to approve
write access in the browser, and waits whenever Strava's rate limit is reached.
