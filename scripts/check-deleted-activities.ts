import { Redis } from '@upstash/redis';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config({ path: '/Users/vumble/dev/personal/statva/.env' });

const TOKEN_ENDPOINT = 'https://www.strava.com/oauth/token';
const ATHLETE_ENDPOINT = 'https://www.strava.com/api/v3/athlete';
const ITEMS_PER_PAGE = 200;

interface Activity {
  id: number;
  name: string;
  start_date: string;
  type: string;
}

interface DetailedActivity extends Activity {
  // Additional fields from cached activities
  [key: string]: unknown;
}

interface DeletedActivityInfo {
  id: number;
  name: string;
  date: string;
  type?: string;
}

let token: string | null = null;
let tokenTimestamp: number = 0;

const isTokenExpired = () => tokenTimestamp + 6 * 3600 * 1000 < Date.now(); // 6 hours

const fetchAccessToken = async (): Promise<string> => {
  if (null === token || isTokenExpired()) {
    const body = JSON.stringify({
      client_id: process.env.VITE_STRAVA_CLIENT_ID,
      client_secret: process.env.VITE_STRAVA_CLIENT_SECRET,
      refresh_token: process.env.VITE_STRAVA_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    });

    try {
      const response = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Content-Type': 'application/json',
        },
        body,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch token: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as { access_token: string };
      token = data.access_token;
      tokenTimestamp = Date.now();
    } catch (error) {
      console.error('Error fetching access token:', error);
      throw error;
    }
  }

  return token;
};

const fetchAllActivitiesFromStrava = async (): Promise<Activity[]> => {
  const accessToken = await fetchAccessToken();
  const activities: Activity[] = [];
  let page = 1;
  let hasMore = true;

  console.log('Fetching all activities from Strava API...');

  while (hasMore) {
    try {
      const response = await fetch(
        `${ATHLETE_ENDPOINT}/activities?access_token=${accessToken}&page=${page}&per_page=${ITEMS_PER_PAGE}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch activities: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as Activity[];

      if (data.length === 0) {
        hasMore = false;
      } else {
        activities.push(...data);
        console.log(`  Page ${page}: fetched ${data.length} activities (total: ${activities.length})`);
        page++;

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`Error fetching page ${page}:`, error);
      throw error;
    }
  }

  console.log(`Total activities from Strava API: ${activities.length}\n`);
  return activities;
};

const getActivitiesFromRedis = async (): Promise<Record<string, DetailedActivity>> => {
  const client = new Redis({
    url: process.env.VITE_KV_REST_API_URL,
    token: process.env.VITE_KV_REST_API_TOKEN,
  });

  try {
    console.log('Fetching cached activities from Redis...');
    const activities = await client.hgetall<Record<string, DetailedActivity>>('activities');
    const result = activities ?? {};
    console.log(`Total cached activities in Redis: ${Object.keys(result).length}\n`);
    return result;
  } catch (error) {
    console.error('Error fetching from Redis:', error);
    throw error;
  }
};

const analyzeActivities = (
  stravaActivities: Activity[],
  cachedActivities: Record<string, DetailedActivity>
): DeletedActivityInfo[] => {
  console.log('Analyzing activities...\n');

  // Create a set of Strava activity IDs for quick lookup
  const stravaActivityIds = new Set(stravaActivities.map(a => a.id));

  // Find activities in cache that are not in Strava
  const deletedActivities: DeletedActivityInfo[] = [];

  for (const [id, cachedActivity] of Object.entries(cachedActivities)) {
    const activityId = parseInt(id, 10);

    if (!stravaActivityIds.has(activityId)) {
      deletedActivities.push({
        id: activityId,
        name: cachedActivity.name || 'Unknown',
        date: cachedActivity.start_date || 'Unknown',
        type: cachedActivity.type || 'Unknown',
      });
    }
  }

  // Sort by date (newest first)
  deletedActivities.sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateB - dateA;
  });

  return deletedActivities;
};

const formatResults = (deletedActivities: DeletedActivityInfo[]): string => {
  if (deletedActivities.length === 0) {
    return 'No deleted activities found. All cached activities exist in Strava.';
  }

  let output = `Found ${deletedActivities.length} deleted activities:\n`;
  output += '═'.repeat(80) + '\n\n';

  deletedActivities.forEach((activity, index) => {
    const date = new Date(activity.date);
    const formattedDate = date.toISOString().split('T')[0];

    output += `${index + 1}. ID: ${activity.id}\n`;
    output += `   Name: ${activity.name}\n`;
    output += `   Date: ${formattedDate}\n`;
    output += `   Type: ${activity.type}\n\n`;
  });

  output += '═'.repeat(80) + '\n';
  output += `Summary: ${deletedActivities.length} activities in cache are no longer in Strava\n`;

  return output;
};

const main = async () => {
  try {
    console.log('Activity Deletion Checker');
    console.log('═'.repeat(80) + '\n');

    // Validate environment variables
    const requiredEnvVars = [
      'VITE_STRAVA_CLIENT_ID',
      'VITE_STRAVA_CLIENT_SECRET',
      'VITE_STRAVA_REFRESH_TOKEN',
      'VITE_KV_REST_API_URL',
      'VITE_KV_REST_API_TOKEN',
    ];

    const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);
    if (missingEnvVars.length > 0) {
      throw new Error(`Missing environment variables: ${missingEnvVars.join(', ')}`);
    }

    // Fetch data from both sources
    const stravaActivities = await fetchAllActivitiesFromStrava();
    const cachedActivities = await getActivitiesFromRedis();

    // Analyze and identify deleted activities
    const deletedActivities = analyzeActivities(stravaActivities, cachedActivities);

    // Format and display results
    const results = formatResults(deletedActivities);
    console.log(results);

    // Also save results to a JSON file for reference
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = `/Users/vumble/dev/personal/statva/scripts/deleted-activities-${timestamp}.json`;

    const jsonOutput = {
      timestamp: new Date().toISOString(),
      summary: {
        total_cached_activities: Object.keys(cachedActivities).length,
        total_strava_activities: stravaActivities.length,
        deleted_activities_count: deletedActivities.length,
      },
      deleted_activities: deletedActivities,
    };

    await import('fs').then(fs =>
      fs.promises.writeFile(outputFile, JSON.stringify(jsonOutput, null, 2))
    );

    console.log(`\nDetailed results saved to: ${outputFile}`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

main();
