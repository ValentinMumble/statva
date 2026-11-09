import {HourForecast, Pace, PlannedRoute, routeFromPoints, RouteSource} from '../models/ride-weather';
import {getJson} from './strava';

/**
 * Where Ride weather gets its routes and forecasts: the rider's saved routes on Strava
 * (through the server, which holds the tokens), a Komoot tour from its link and the forecast
 * from Open-Meteo, both straight from the browser (they need no key and allow it).
 */

// Strava route ids pass JavaScript's safe integers: id_str is the one to use.
type StravaRoute = {id_str: string; name: string; distance: number; elevation_gain: number; type: number};

const fetchStravaRoutes = (athleteId: number): Promise<StravaRoute[]> =>
  getJson<StravaRoute[]>(`/api/strava?${new URLSearchParams({path: `athletes/${athleteId}/routes`, per_page: '100'})}`);

type Stream = {type: string; data: unknown[]};

const fetchStravaRoute = async (route: StravaRoute): Promise<PlannedRoute> => {
  const streams = await getJson<Stream[]>(
    `/api/strava?${new URLSearchParams({path: `routes/${route.id_str}/streams`})}`,
  );
  const data = (type: string) => streams.find(stream => type === stream.type)?.data ?? [];

  return {
    name: route.name,
    source: {service: 'strava', url: `https://www.strava.com/routes/${route.id_str}`},
    points: routeFromPoints(
      data('latlng') as [number, number][],
      data('altitude') as number[],
      0 < data('distance').length ? (data('distance') as number[]) : null,
    ),
  };
};

class UnknownLinkError extends Error {}

/** A Komoot tour from its link: public, or private with the link its share button gives. */
const fetchKomootTour = async (link: string): Promise<PlannedRoute> => {
  const url = new URL(link.trim());
  const id = url.pathname.match(/\/tour\/(\d+)/)?.[1];
  if (!url.hostname.endsWith('komoot.com') && !url.hostname.endsWith('komoot.de')) throw new UnknownLinkError();
  if (undefined === id) throw new UnknownLinkError();

  const query = new URLSearchParams({_embedded: 'coordinates'});
  const shareToken = url.searchParams.get('share_token');
  if (null !== shareToken) query.set('share_token', shareToken);

  const response = await fetch(`https://www.komoot.com/api/v007/tours/${id}?${query}`);
  if (!response.ok) throw new Error(`Komoot answered ${response.status}`);

  const tour = (await response.json()) as {
    name: string;
    _embedded: {coordinates: {items: {lat: number; lng: number; alt?: number}[]}};
  };
  const items = tour._embedded.coordinates.items;

  return {
    name: tour.name,
    // The tour's own page, without the share token: the rider's link stays theirs.
    source: {service: 'komoot', url: `https://www.komoot.com/tour/${id}`},
    points: routeFromPoints(
      items.map(({lat, lng}) => [lat, lng]),
      items.map(({alt}) => alt ?? 0),
    ),
  };
};

const HOURLY = [
  'temperature_2m',
  'apparent_temperature',
  'precipitation_probability',
  'precipitation',
  'cloud_cover',
  'wind_speed_10m',
  'wind_gusts_10m',
  'wind_direction_10m',
];

type OpenMeteoPlace = {hourly: Record<string, number[]> & {time: number[]}};

const day = (time: number) => new Date(time).toISOString().slice(0, 10);

/** The hourly forecast at each place, from the first to the last time asked (km/h, °C, mm). */
const fetchForecasts = async (
  places: {lat: number; lng: number}[],
  from: number,
  to: number,
): Promise<HourForecast[][]> => {
  const query = new URLSearchParams({
    latitude: places.map(({lat}) => lat.toFixed(3)).join(','),
    longitude: places.map(({lng}) => lng.toFixed(3)).join(','),
    hourly: HOURLY.join(','),
    timezone: 'GMT',
    timeformat: 'unixtime',
    start_date: day(from),
    end_date: day(to),
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${query}`);
  if (!response.ok) throw new Error(((await response.json().catch(() => ({}))) as {reason?: string}).reason);

  const answer = (await response.json()) as OpenMeteoPlace | OpenMeteoPlace[];

  // One place comes back alone, several as a list.
  return (Array.isArray(answer) ? answer : [answer]).map(({hourly}) =>
    hourly.time.map((time, index) => ({
      time: time * 1000,
      temperature: hourly.temperature_2m[index],
      feelsLike: hourly.apparent_temperature[index],
      rainChance: hourly.precipitation_probability[index] ?? 0,
      rain: hourly.precipitation[index] ?? 0,
      cloud: hourly.cloud_cover[index],
      wind: hourly.wind_speed_10m[index],
      gust: hourly.wind_gusts_10m[index],
      windFrom: hourly.wind_direction_10m[index],
    })),
  );
};

// One of the rider's planned tours on Komoot, through the server, which holds the login.
type KomootTourSummary = {
  id: number;
  name: string;
  distance: number;
  elevation_up: number;
  sport: string;
  date: string;
};

/** The rider's planned Komoot tours, newest first: only once the owner set the Komoot login. */
const fetchKomootTours = (): Promise<KomootTourSummary[]> =>
  getJson<KomootTourSummary[]>('/api/activity?action=komoot');

const fetchKomootSavedTour = async (id: number): Promise<PlannedRoute> => {
  const tour = await getJson<{name: string; points: {lat: number; lng: number; alt?: number}[]}>(
    `/api/activity?action=komoot&id=${id}`,
  );

  return {
    name: tour.name,
    source: {service: 'komoot', url: `https://www.komoot.com/tour/${id}`},
    points: routeFromPoints(
      tour.points.map(({lat, lng}) => [lat, lng]),
      tour.points.map(({alt}) => alt ?? 0),
    ),
  };
};

// Stops (s): left out of links made before they existed, which then take the default.
type SharedRide = {route: PlannedRoute; start: number; pace: Pace; stops?: number};

// A shared route keeps at most this many points: plenty for the map and the forecast.
const SHARED_POINTS = 800;

/** Keeps the ride on the server under a short id, for a link anyone can open; gives the id. */
/** What the server keeps of a ride: its points thinned and rounded. */
const sharedBody = ({route, start, pace, stops}: SharedRide): string => {
  const step = Math.ceil(route.points.length / SHARED_POINTS);
  const kept = route.points.filter((_, index) => 0 === index % step || index === route.points.length - 1);

  return JSON.stringify({
    name: route.name,
    points: kept.map(({lat, lng, altitude, distance}) => [
      Math.round(lat * 1e5) / 1e5,
      Math.round(lng * 1e5) / 1e5,
      Math.round(altitude * 10) / 10,
      Math.round(distance),
    ]),
    start,
    pace,
    stops: undefined === stops ? undefined : Math.round(stops),
    source: route.source,
  });
};

const shareRide = async (ride: SharedRide): Promise<string> => {
  const response = await fetch('/api/activity?action=share', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: sharedBody(ride),
  });
  if (!response.ok) throw new Error(`Sharing failed: ${response.status}`);

  return ((await response.json()) as {id: string}).id;
};

/** Saves the rider's changes to a ride they shared, behind the same link. */
const updateSharedRide = async ({id, ride}: {id: string; ride: SharedRide}): Promise<void> => {
  const response = await fetch(`/api/activity?${new URLSearchParams({action: 'share', id})}`, {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: sharedBody(ride),
  });
  if (!response.ok) throw new Error(`Saving failed: ${response.status}`);
};

/** A ride shared by link, for anyone who has it: no login needed. */
const fetchSharedRide = async (id: string): Promise<SharedRide> => {
  const shared = await getJson<{
    name: string;
    points: [number, number, number, number][];
    start: number;
    pace: Pace;
    stops?: number;
    source?: RouteSource;
  }>(`/api/activity?${new URLSearchParams({action: 'share', id})}`);

  return {
    route: {
      name: shared.name,
      source: shared.source,
      points: shared.points.map(([lat, lng, altitude, distance]) => ({lat, lng, altitude, distance})),
    },
    start: shared.start,
    pace: shared.pace,
    stops: shared.stops,
  };
};

// A shared ride kept for quick access on Ride weather.
type RideBookmark = {id: string; name: string; start: number; distance: number; source?: RouteSource};

/** The rider's bookmarked rides still to come, soonest first. */
const fetchBookmarks = async (): Promise<RideBookmark[]> =>
  await getJson<RideBookmark[]>(`/api/activity?${new URLSearchParams({action: 'bookmark'})}`);

const changeBookmark = async (method: 'POST' | 'DELETE', id: string): Promise<void> => {
  const response = await fetch(`/api/activity?${new URLSearchParams({action: 'bookmark', id})}`, {method});
  if (!response.ok)
    throw new Error(404 === response.status ? 'This ride is not shared any more' : `${response.status}`);
};

const bookmarkRide = async (id: string): Promise<void> => await changeBookmark('POST', id);
const unbookmarkRide = async (id: string): Promise<void> => await changeBookmark('DELETE', id);

type NominatimPlace = {address?: Record<string, string>};
// From the town down to the hamlet: the first one OpenStreetMap knows names the place.
const PLACE_LEVELS = ['city', 'town', 'village', 'hamlet', 'suburb', 'municipality'];

/**
 * The names of the towns where a ride starts and ends, from OpenStreetMap (Nominatim, no
 * key), in the page's language; null where it knows none. One after the other, as Nominatim
 * asks for at most one request a second.
 */
const fetchPlaceNames = async (places: {lat: number; lng: number}[], locale: string): Promise<(string | null)[]> => {
  const names: (string | null)[] = [];
  for (const {lat, lng} of places) {
    const query = new URLSearchParams({
      format: 'jsonv2',
      lat: lat.toFixed(4),
      lon: lng.toFixed(4),
      zoom: '14',
      'accept-language': locale,
    });
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${query}`);
    const {address = {}} = response.ok ? ((await response.json()) as NominatimPlace) : {};
    names.push(PLACE_LEVELS.map(level => address[level]).find(Boolean) ?? null);
  }

  return names;
};

export {
  bookmarkRide,
  fetchBookmarks,
  fetchForecasts,
  fetchKomootSavedTour,
  fetchKomootTour,
  fetchKomootTours,
  fetchPlaceNames,
  fetchSharedRide,
  fetchStravaRoute,
  fetchStravaRoutes,
  shareRide,
  unbookmarkRide,
  UnknownLinkError,
  updateSharedRide,
};
export type {KomootTourSummary, RideBookmark, SharedRide, StravaRoute};
