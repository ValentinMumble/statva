import {allowedAthletes} from './env.js';
import {redis} from './redis.js';

/**
 * The owner's planned tours on Komoot, for Ride weather. Komoot has no open API: this logs in
 * the way its own apps and community tools do, with the email and password set in
 * KOMOOT_EMAIL and KOMOOT_PASSWORD, and keeps the session key Komoot answers with (never the
 * password) for the next calls. Only the owner (the first athlete allowed) gets it.
 */

const API = 'https://api.komoot.de';
const SESSION_KEY = 'komoot_session';

type Session = {username: string; token: string};
type KomootTour = {id: number; name: string; distance: number; elevation_up: number; sport: string; date: string};
type KomootPoint = {lat: number; lng: number; alt?: number};

class KomootUnavailableError extends Error {}

const basic = (user: string, secret: string) => `Basic ${Buffer.from(`${user}:${secret}`).toString('base64')}`;

/** Komoot for this rider: only the owner, and only once the login is set. */
const canUseKomoot = (athleteId: number): boolean =>
  athleteId === allowedAthletes()[0] && Boolean(process.env.KOMOOT_EMAIL) && Boolean(process.env.KOMOOT_PASSWORD);

const logIn = async (): Promise<Session> => {
  const email = process.env.KOMOOT_EMAIL ?? '';
  const response = await fetch(`${API}/v006/account/email/${encodeURIComponent(email)}/`, {
    headers: {Authorization: basic(email, process.env.KOMOOT_PASSWORD ?? '')},
  });
  if (!response.ok) throw new KomootUnavailableError(`Komoot refused the login (${response.status})`);

  const {username, password} = (await response.json()) as {username: string; password: string};
  const session = {username, token: password};
  await redis().set(SESSION_KEY, session);

  return session;
};

/** A call to Komoot with the kept session, logging in again once when it has run out. */
const komootGet = async (path: (session: Session) => string): Promise<unknown> => {
  for (const fresh of [false, true]) {
    const session = (fresh ? null : await redis().get<Session>(SESSION_KEY)) ?? (await logIn());
    const response = await fetch(`${API}${path(session)}`, {
      headers: {Authorization: basic(session.username, session.token)},
    });
    if (response.ok) return await response.json();
    if (401 !== response.status && 403 !== response.status)
      throw new KomootUnavailableError(`Komoot answered ${response.status}`);
  }
  throw new KomootUnavailableError('Komoot refused the session');
};

/** The owner's planned tours, newest first. */
const komootTours = async (): Promise<KomootTour[]> => {
  const answer = (await komootGet(
    ({username}) =>
      `/v007/users/${username}/tours/?${new URLSearchParams({type: 'tour_planned', sort_field: 'date', sort_direction: 'desc', limit: '100'})}`,
  )) as {_embedded?: {tours?: KomootTour[]}};

  return (answer._embedded?.tours ?? []).map(({id, name, distance, elevation_up, sport, date}) => ({
    id,
    name,
    distance,
    elevation_up,
    sport,
    date,
  }));
};

/** One of the owner's tours, with its points. */
const komootTour = async (id: number): Promise<{name: string; points: KomootPoint[]}> => {
  const tour = (await komootGet(() => `/v007/tours/${id}?_embedded=coordinates`)) as {
    name: string;
    _embedded: {coordinates: {items: KomootPoint[]}};
  };

  return {name: tour.name, points: tour._embedded.coordinates.items.map(({lat, lng, alt}) => ({lat, lng, alt}))};
};

export {canUseKomoot, komootTour, komootTours, KomootUnavailableError};
export type {KomootTour};
