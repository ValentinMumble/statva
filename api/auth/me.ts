import {json} from '../_lib/http.js';
import {readSession} from '../_lib/session.js';

export const GET = (request: Request): Response => {
  const athleteId = readSession(request);

  return null === athleteId ? json({error: 'Not logged in'}, 401) : json({athleteId});
};
