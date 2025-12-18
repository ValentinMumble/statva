#!/usr/bin/env node

/**
 * Remove Deleted Activities from Redis Cache
 *
 * This script:
 * 1. Reads the deleted activities from the JSON report
 * 2. Connects to Redis using environment variables
 * 3. Deletes each activity from the Redis 'activities' hash using HDEL
 * 4. Displays confirmation of what was deleted
 * 5. Shows the final count of remaining activities in cache
 *
 * Usage: node -r ts-node/register scripts/remove-deleted-activities.ts
 * Or:    npx ts-node scripts/remove-deleted-activities.ts
 *
 * Required environment variables:
 * - VITE_KV_REST_API_URL
 * - VITE_KV_REST_API_TOKEN
 */

import { Redis } from '@upstash/redis';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory (ESM compatible)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Interface for deleted activities from the report
 */
interface DeletedActivity {
  id: number;
  name: string;
  date: string;
  type: string;
}

/**
 * Interface for the report file
 */
interface ActivityReport {
  timestamp: string;
  summary: {
    total_cached_activities: number;
    total_strava_activities: number;
    deleted_activities_count: number;
  };
  deleted_activities: DeletedActivity[];
}

/**
 * Interface for deletion results
 */
interface DeletionResults {
  successful: Array<{ id: number; name: string }>;
  failed: Array<{ id: number; name: string; error: string }>;
}

/**
 * Load environment variables from .env file
 */
const loadEnvVariables = async (): Promise<void> => {
  const envPath = path.resolve(__dirname, '../.env');
  try {
    const envContent = await fs.readFile(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
          if (!process.env[key.trim()]) {
            process.env[key.trim()] = value;
          }
        }
      }
    });
  } catch (error) {
    console.warn(`Warning: Could not read .env file at ${envPath}`);
  }
};

/**
 * Validate required environment variables
 */
const validateEnvironment = (): void => {
  const requiredEnvVars = ['VITE_KV_REST_API_URL', 'VITE_KV_REST_API_TOKEN'];
  const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);

  if (missingEnvVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingEnvVars.join(', ')}\n` +
      `Please ensure your .env file contains these variables or set them in your shell environment.`
    );
  }
};

/**
 * Read deleted activities from JSON report
 */
const readDeletedActivities = async (reportPath: string): Promise<DeletedActivity[]> => {
  try {
    const content = await fs.readFile(reportPath, 'utf-8');
    const report: ActivityReport = JSON.parse(content);

    if (!report.deleted_activities || !Array.isArray(report.deleted_activities)) {
      throw new Error('Invalid report format: missing deleted_activities array');
    }

    return report.deleted_activities;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Report file not found: ${reportPath}`);
    }
    throw new Error(`Failed to read report file: ${(error as Error).message}`);
  }
};

/**
 * Get current activities count from Redis
 */
const getActivitiesCount = async (client: Redis): Promise<number> => {
  try {
    const activities = await client.hgetall('activities');
    return activities ? Object.keys(activities).length : 0;
  } catch (error) {
    throw new Error(`Failed to get activities count: ${(error as Error).message}`);
  }
};

/**
 * Delete activities from Redis cache
 */
const deleteActivitiesFromRedis = async (
  client: Redis,
  deletedActivities: DeletedActivity[]
): Promise<DeletionResults> => {
  const results: DeletionResults = {
    successful: [],
    failed: [],
  };

  for (const activity of deletedActivities) {
    try {
      const activityId = String(activity.id);
      await client.hdel('activities', activityId);
      results.successful.push({
        id: activity.id,
        name: activity.name,
      });
    } catch (error) {
      results.failed.push({
        id: activity.id,
        name: activity.name,
        error: (error as Error).message,
      });
    }
  }

  return results;
};

/**
 * Format and display deletion results
 */
const displayResults = (
  deletionResults: DeletionResults,
  initialCount: number,
  finalCount: number
): void => {
  console.log('\n' + '═'.repeat(80));
  console.log('DELETION RESULTS');
  console.log('═'.repeat(80) + '\n');

  if (deletionResults.successful.length > 0) {
    console.log(`Successfully deleted ${deletionResults.successful.length} activities:\n`);
    deletionResults.successful.forEach((activity, index) => {
      console.log(`  ${index + 1}. ID: ${activity.id}`);
      console.log(`     Name: ${activity.name}`);
    });
    console.log('');
  }

  if (deletionResults.failed.length > 0) {
    console.log(`Failed to delete ${deletionResults.failed.length} activities:\n`);
    deletionResults.failed.forEach((activity, index) => {
      console.log(`  ${index + 1}. ID: ${activity.id}`);
      console.log(`     Name: ${activity.name}`);
      console.log(`     Error: ${activity.error}`);
    });
    console.log('');
  }

  console.log('═'.repeat(80));
  console.log('CACHE STATISTICS');
  console.log('═'.repeat(80));
  console.log(`Initial activity count: ${initialCount}`);
  console.log(`Activities deleted: ${deletionResults.successful.length}`);
  console.log(`Final activity count: ${finalCount}`);
  console.log(`Difference: ${initialCount - finalCount}`);
  console.log('═'.repeat(80) + '\n');
};

/**
 * Main execution
 */
const main = async (): Promise<void> => {
  try {
    console.log('Remove Deleted Activities from Redis Cache');
    console.log('═'.repeat(80));

    // Load environment variables
    await loadEnvVariables();

    // Validate environment
    validateEnvironment();

    // Get report path from arguments or use default
    const reportPath = process.argv[2] || path.resolve(__dirname, '../scripts/deleted-activities-2025-12-18T07-36-45-548.json');

    console.log(`\nReport path: ${reportPath}\n`);

    // Read deleted activities from report
    console.log('Reading deleted activities from report...');
    const deletedActivities = await readDeletedActivities(reportPath);
    console.log(`Found ${deletedActivities.length} deleted activities\n`);

    // Connect to Redis
    const client = new Redis({
      url: process.env.VITE_KV_REST_API_URL || '',
      token: process.env.VITE_KV_REST_API_TOKEN || '',
    });

    // Get initial count
    console.log('Connecting to Redis cache...');
    const initialCount = await getActivitiesCount(client);
    console.log(`Current activities in cache: ${initialCount}\n`);

    // Delete activities
    console.log(`Deleting ${deletedActivities.length} activities from cache...\n`);
    const deletionResults = await deleteActivitiesFromRedis(client, deletedActivities);

    // Get final count
    const finalCount = await getActivitiesCount(client);

    // Display results
    displayResults(deletionResults, initialCount, finalCount);

    // Exit with appropriate code
    if (deletionResults.failed.length > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('\nError:', (error as Error).message);
    console.error('\nUsage: npx ts-node scripts/remove-deleted-activities.ts [report-path]');
    console.error('\nExample: npx ts-node scripts/remove-deleted-activities.ts scripts/deleted-activities-2025-12-18T07-36-45-548.json');
    process.exit(1);
  }
};

main();
