import {DetailedActivity} from './models';

const clientId = import.meta.env.VITE_STRAVA_CLIENT_ID;
const clientSecret = import.meta.env.VITE_STRAVA_CLIENT_SECRET;
const refreshToken = import.meta.env.VITE_STRAVA_REFRESH_TOKEN;
const userId = import.meta.env.VITE_STRAVA_USER_ID;

const TOKEN_ENDPOINT = 'https://www.strava.com/oauth/token';
const ATHLETES_ENDPOINT = `https://www.strava.com/api/v3/athletes/${userId}`;

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

const activities: {[id: string]: DetailedActivity} = {};
let isInitializing = false;

const initializeActivities = async () => {
  if (isInitializing) {
    return;
  }

  isInitializing = true;
  const {access_token: accessToken} = await getAccessToken();

  let page = 1;
  let itemsPerPage = 200;
  let resultCount = 0;

  do {
    const response = await fetch(
      `${ATHLETES_ENDPOINT}/activities?access_token=${accessToken}&page=${page}&per_page=${itemsPerPage}`
    );

    const data = (await response.json()) as DetailedActivity[];

    data.forEach(activity => (activities[activity.id] = activity));

    resultCount = data.length;
    page++;
  } while (resultCount === itemsPerPage);
};

const getActivities = async (): Promise<DetailedActivity[] | null> => {
  await initializeActivities();

  if (isInitializing && Object.values(activities).length === 0) {
    return null;
  }

  return Promise.resolve(Object.values(activities));
};

export {getActivities};
