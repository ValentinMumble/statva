import {DetailedActivity, DetailedAthlete} from './models';

const clientId = import.meta.env.VITE_STRAVA_CLIENT_ID;
const clientSecret = import.meta.env.VITE_STRAVA_CLIENT_SECRET;
const refreshToken = import.meta.env.VITE_STRAVA_REFRESH_TOKEN;

const TOKEN_ENDPOINT = 'https://www.strava.com/oauth/token';
const ATHLETE_ENDPOINT = `https://www.strava.com/api/v3/athlete`;
const ITEMS_PER_PAGE = 200;

const getAccessToken = async () => {
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

  return response.json();
};

const fetchAthlete = async (): Promise<DetailedAthlete> => {
  const {access_token: accessToken} = await getAccessToken();

  const response = await fetch(`${ATHLETE_ENDPOINT}?access_token=${accessToken}`);

  return await response.json();
};

const fetchAllActivities = async (): Promise<DetailedActivity[]> => {
  const {access_token: accessToken} = await getAccessToken();

  let page = 1;
  let resultCount = 0;
  const activities: {[id: string]: DetailedActivity} = {};

  do {
    const response = await fetch(
      `${ATHLETE_ENDPOINT}/activities?access_token=${accessToken}&page=${page}&per_page=${ITEMS_PER_PAGE}`
    );

    const data = (await response.json()) as DetailedActivity[];

    data.forEach(activity => (activities[activity.id] = activity));

    resultCount = data.length;
    page++;
  } while (resultCount === ITEMS_PER_PAGE);

  return Object.values(activities);
};

export {fetchAllActivities, fetchAthlete, ITEMS_PER_PAGE};
