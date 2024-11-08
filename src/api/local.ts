import {Labels, Event, FTPTest} from '../models';
import {DetailedActivity, DetailedAthlete} from '../models/strava';

const fetchLocalActivities = async (): Promise<[DetailedActivity[], boolean]> => [
  await (await fetch('/local_activities.json')).json(),
  false,
];

const fetchLocalAthlete = async (): Promise<DetailedAthlete> => await (await fetch('/local_athlete.json')).json();

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

export {fetchLocalActivities, fetchLocalLabels, fetchLocalEvents, fetchLocalFTPTests, fetchLocalAthlete};
