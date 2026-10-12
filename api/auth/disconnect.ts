import {redirect} from '../_lib/http.js';
import {clearSessionCookie, readSession} from '../_lib/session.js';
import {deauthorize, forgetTokens} from '../_lib/strava.js';
import {forgetAthlete} from '../_lib/sync.js';

/** Revokes Statva's access on Strava and deletes everything Statva holds for the rider. */
export const POST = async (request: Request): Promise<Response> => {
  const athleteId = readSession(request);

  if (null !== athleteId) {
    await deauthorize(athleteId).catch(() => undefined);
    await forgetAthlete(athleteId);
    await forgetTokens(athleteId);
  }

  return redirect('/', {'Set-Cookie': clearSessionCookie()});
};
