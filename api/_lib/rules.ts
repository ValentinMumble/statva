/**
 * Rules for rides that come back again and again, like a commute: a ride that turns around
 * at a place (goes there and back, or ends there) gets a name, the commute flag and a bike,
 * as soon as it lands on Strava. Riders keep them in their settings (rideRules). Where the
 * ride turns is what tells: a ride that only passes by goes on somewhere else.
 */

type RideRule = {
  name: string;
  // Where the ride turns around, and how close to it, in metres.
  place: [number, number];
  radiusM: number;
  // Longer rides only pass by: a commute stays short.
  maxKm: number;
  weekdaysOnly: boolean;
  commute: boolean;
  gearId: string | null;
};

type RuledActivity = {
  id: number;
  name: string;
  sport_type: string;
  distance: number;
  commute?: boolean;
  gear_id?: string | null;
  start_date_local: string;
  map?: {polyline?: string; summary_polyline?: string};
};

type RuleUpdate = {name?: string; commute?: boolean; gear_id?: string};

// The same test as the app's, so a name a rider chose (with an emoji) is never replaced.
const EMOJI = /\p{Extended_Pictographic}|\p{Regional_Indicator}|[0-9#*]️?⃣/u;
const METRES_PER_DEGREE = 111_320;

const isPedalled = (sport: string): boolean =>
  sport.includes('Ride') || 'Velomobile' === sport || 'Handcycle' === sport;

/** The points of a Google encoded polyline, as Strava sends tracks. */
const decodePolyline = (encoded: string): [number, number][] => {
  const points: [number, number][] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    for (const axis of [0, 1]) {
      let shift = 0;
      let result = 0;
      let byte: number;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (0x20 <= byte);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (0 === axis) latitude += delta;
      else longitude += delta;
    }
    points.push([latitude / 1e5, longitude / 1e5]);
  }

  return points;
};

const metresBetween = ([latitudeA, longitudeA]: [number, number], [latitudeB, longitudeB]: [number, number]): number =>
  Math.hypot(
    (latitudeA - latitudeB) * METRES_PER_DEGREE,
    (longitudeA - longitudeB) * METRES_PER_DEGREE * Math.cos((latitudeA * Math.PI) / 180),
  );

/** Whether the ride is one the rule is about: pedalled, short enough, on a weekday if asked, turning at the place. */
const matchesRule = (activity: RuledActivity, rule: RideRule): boolean => {
  const weekday = new Date(activity.start_date_local).getUTCDay();
  const track = decodePolyline(activity.map?.polyline || activity.map?.summary_polyline || '');

  if (0 === track.length) return false;

  // The point farthest from the start: the far end of a round trip, or where a one-way ride ends.
  const turn = track.reduce((farthest, point) =>
    metresBetween(point, track[0]) > metresBetween(farthest, track[0]) ? point : farthest,
  );

  return (
    isPedalled(activity.sport_type) &&
    activity.distance <= rule.maxKm * 1000 &&
    (!rule.weekdaysOnly || (0 !== weekday && 6 !== weekday)) &&
    metresBetween(turn, rule.place) <= rule.radiusM
  );
};

/** What the first matching rule would change on the ride, or null when nothing would. */
const ruleUpdate = (activity: RuledActivity, rules: RideRule[]): RuleUpdate | null => {
  const rule = rules.find(candidate => matchesRule(activity, candidate));

  if (undefined === rule) return null;

  const update: RuleUpdate = {};
  if (!EMOJI.test(activity.name) && rule.name !== activity.name) update.name = rule.name;
  if (rule.commute && !activity.commute) update.commute = true;
  if (null !== rule.gearId && rule.gearId !== activity.gear_id) update.gear_id = rule.gearId;

  return 0 === Object.keys(update).length ? null : update;
};

export {matchesRule, ruleUpdate};
export type {RideRule, RuledActivity, RuleUpdate};
