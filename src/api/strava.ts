import {Activity, ActivityZone, Athlete, DetailedActivity, Route} from '../models/strava';

const TOKEN_ENDPOINT = 'https://www.strava.com/oauth/token';
const ATHLETE_ENDPOINT = `https://www.strava.com/api/v3/athlete`;
const ACTIVITY_ENDPOINT = 'https://www.strava.com/api/v3/activities';
const getAthleteRoutesEndpoint = (id: string) => `${ATHLETE_ENDPOINT}s/${id}/routes`;
const ITEMS_PER_PAGE = 200;

const assertOk = async (response: Response): Promise<Response> => {
  if (!response.ok) {
    const body = await response.clone().json().catch(() => ({}));
    throw new Error(`Strava API ${response.status}: ${body.message ?? response.statusText}`);
  }
  return response;
};

let token: string | null = null;
let tokenTimestamp: number = 0;
let refreshPromise: Promise<string> | null = null;

const TOKEN_TTL_MS = 6 * 3_600_000;
const isTokenExpired = () => tokenTimestamp + TOKEN_TTL_MS < Date.now();

const fetchAccessToken = async () => {
  if (token !== null && !isTokenExpired()) return token;

  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const body = JSON.stringify({
      client_id: import.meta.env.VITE_STRAVA_CLIENT_ID,
      client_secret: import.meta.env.VITE_STRAVA_CLIENT_SECRET,
      refresh_token: import.meta.env.VITE_STRAVA_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    });

    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        Accept: 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
      },
      body,
    });

    await assertOk(response);
    token = (await response.json()).access_token;
    tokenTimestamp = Date.now();

    return token!;
  })().finally(() => { refreshPromise = null; });

  return refreshPromise;
};

const fetchAthlete = async (): Promise<Athlete> => {
  const accessToken = await fetchAccessToken();
  const response = await fetch(`${ATHLETE_ENDPOINT}?access_token=${accessToken}`);
  await assertOk(response);

  return await response.json();
};

const fetchActivities = async (page: number, items = ITEMS_PER_PAGE): Promise<[Activity[], boolean]> => {
  const accessToken = await fetchAccessToken();

  const response = await fetch(
    `${ATHLETE_ENDPOINT}/activities?access_token=${accessToken}&page=${page}&per_page=${items}`
  );
  await assertOk(response);
  const activities = await response.json();

  return [activities, activities.length === items];
};

const fetchActivity = async (id: number): Promise<DetailedActivity> => {
  const accessToken = await fetchAccessToken();

  const response = await fetch(`${ACTIVITY_ENDPOINT}/${id}?access_token=${accessToken}`);
  await assertOk(response);

  return await response.json();
};

const fetchAthleteRoutes = async (): Promise<Route[]> => {
  const accessToken = await fetchAccessToken();

  const response = await fetch(
    `${getAthleteRoutesEndpoint(import.meta.env.VITE_STRAVA_USER_ID)}?access_token=${accessToken}`
  );
  await assertOk(response);

  return await response.json();
};

const fetchActivityZones = async (id: number): Promise<ActivityZone[]> => {
  const accessToken = await fetchAccessToken();

  const response = await fetch(`${ACTIVITY_ENDPOINT}/${id}/zones?access_token=${accessToken}`);
  await assertOk(response);

  return await response.json();
};

export {fetchActivity, fetchActivities, fetchActivityZones, fetchAthlete, fetchAthleteRoutes};
