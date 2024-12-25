import {Labels, Event, FTPTest} from '../models';
import {Activity, Athlete, DetailedActivity} from '../models/strava';

const fetchLocalActivities = async (): Promise<[Activity[], boolean]> => [
  await (await fetch('/local_activities.json')).json(),
  false,
];

const fetchLocalAthlete = async (): Promise<Athlete> => await (await fetch('/local_athlete.json')).json();
const fetchLocalMeta = async (): Promise<Record<string, DetailedActivity>> =>
  await (await fetch('/local_meta.json')).json();
const fetchLocalLabels = async (): Promise<Labels> => await (await fetch('/local_labels.json')).json();

const fetchLocalEvents = async (): Promise<Event[]> =>
  Object.values<Event>(await (await fetch('/local_events.json')).json()).map(event => ({
    ...event,
    date: new Date(event.date),
  }));

const fetchLocalFTPTests = async (): Promise<FTPTest[]> =>
  Object.values<FTPTest>(await (await fetch('/local_ftp_tests.json')).json()).map(ftpTest => ({
    ...ftpTest,
    date: new Date(ftpTest.date),
  }));

export {
  fetchLocalActivities,
  fetchLocalAthlete,
  fetchLocalEvents,
  fetchLocalFTPTests,
  fetchLocalLabels,
  fetchLocalMeta,
};
