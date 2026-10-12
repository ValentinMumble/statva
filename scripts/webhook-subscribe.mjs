/**
 * Registers Statva's webhook with Strava, once per Strava app. Strava then calls
 * <url>/api/webhook whenever an activity is created, changed or deleted, or a rider
 * disconnects. Strava allows one subscription per app.
 *
 * Usage:
 *   node scripts/webhook-subscribe.mjs https://statva.vumble.dev    # subscribe
 *   node scripts/webhook-subscribe.mjs                              # show the current one
 */
import {createHmac} from 'crypto';
import {loadEnv} from './env.mjs';

const env = loadEnv(['STRAVA_CLIENT_ID', 'STRAVA_CLIENT_SECRET']);
// Same as webhookVerifyToken() in api/_lib/env.ts: the server recomputes it to check Strava's call.
const verifyToken = createHmac('sha256', env.STRAVA_CLIENT_SECRET).update('statva-webhook').digest('hex').slice(0, 32);
const ENDPOINT = 'https://www.strava.com/api/v3/push_subscriptions';
const [, , origin] = process.argv;

const main = async () => {
  const credentials = new URLSearchParams({client_id: env.STRAVA_CLIENT_ID, client_secret: env.STRAVA_CLIENT_SECRET});

  if (undefined === origin) {
    const current = await (await fetch(`${ENDPOINT}?${credentials}`)).json();

    return console.log(0 === current.length ? 'No subscription yet.' : current.map(({id, callback_url}) => `${id}  ${callback_url}`).join('\n'));
  }

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    body: new URLSearchParams({...Object.fromEntries(credentials), callback_url: `${origin}/api/webhook`, verify_token: verifyToken}),
  });
  const body = await response.json();

  console.log(response.ok ? `Subscribed: ${body.id}` : `Strava refused: ${JSON.stringify(body)}`);
};

main().catch(error => {
  console.error(error);
  process.exit(1);
});
