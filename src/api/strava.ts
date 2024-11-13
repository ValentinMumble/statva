import {Activity, Athlete} from '../models/strava';

const TOKEN_ENDPOINT = 'https://www.strava.com/oauth/token';
const ATHLETE_ENDPOINT = `https://www.strava.com/api/v3/athlete`;
const ITEMS_PER_PAGE = 150;

const clientId = import.meta.env.VITE_STRAVA_CLIENT_ID;
const clientSecret = import.meta.env.VITE_STRAVA_CLIENT_SECRET;
const refreshToken = import.meta.env.VITE_STRAVA_REFRESH_TOKEN;

let token: string | null = null;
let tokenTimestamp: number = 0;

const isTokenExpired = () => tokenTimestamp + 6 * 3600 * 1000 < Date.now();

const fetchAccessToken = async () => {
  if (null === token || isTokenExpired()) {
    const body = JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
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

    token = (await response.json()).access_token;
    tokenTimestamp = Date.now();
  }

  return token;
};

const fetchAthlete = async (): Promise<Athlete> => {
  const accessToken = await fetchAccessToken();
  const response = await fetch(`${ATHLETE_ENDPOINT}?access_token=${accessToken}`);

  return await response.json();
};

const fetchActivities = async (page: number, items = ITEMS_PER_PAGE): Promise<[Activity[], boolean]> => {
  const accessToken = await fetchAccessToken();

  const response = await fetch(
    `${ATHLETE_ENDPOINT}/activities?access_token=${accessToken}&page=${page}&per_page=${items}`
  );
  const activities = await response.json();

  return [activities, activities.length === items];
};

const fetchAllActivities = async () => {
  const accessToken = await fetchAccessToken();

  let page = 1;
  let resultCount = 0;
  const activities: {[id: string]: Activity} = {};

  do {
    const response = await fetch(
      `${ATHLETE_ENDPOINT}/activities?access_token=${accessToken}&page=${page}&per_page=${ITEMS_PER_PAGE}`
    );

    const data = (await response.json()) as Activity[];

    data.forEach(activity => (activities[activity.id] = activity));

    resultCount = data.length;
    page++;
  } while (resultCount === ITEMS_PER_PAGE);

  return Object.values(activities);
};

export {fetchAllActivities, fetchActivities, fetchAthlete};
