import {DetailedActivity} from './strava';

/** How a rider's club names its rides and marks its groups (a rider setting). */
type ClubRules = {
  name: string;
  // Group name -> emojis or words that put a ride in that group, wherever they appear.
  markers: Record<string, string[]>;
  // Fixes applied to a name before reading its group, like "Chill 1" -> "C1".
  renames?: [string, string][];
};


const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// A club without a name would match every ride.
const isClubRide = (name: string, club: Pick<ClubRules, 'name'>): boolean => '' !== club.name && name.includes(club.name);

const REPLACEMENTS: [string, string][] = [
  ['\u2019', "'"],
  ['\u2018', "'"],
  ['cependant', ''],
];

const computeFinishCount = (rideMeta: DetailedActivity[], club: Pick<ClubRules, 'name'>): Record<string, number> => {
  const locationCount: Record<string, number> = {};

  rideMeta.forEach(activity => {
    if (!isClubRide(activity.name, club)) {
      return;
    }

    const fullText = [activity.private_note ?? '', activity.description].join('\n');
    const match = fullText.match(/(?:^|\n)Finish\s+(?:au\s+|à\s+)?([\w\u2018\u2019'\s\p{L}]+)/iu);

    if (match) {
      let location = match[1].split('\n')[0];
      REPLACEMENTS.forEach(([from, to]) => (location = location.replace(from, to)));

      // Strip French articles (l', la)
      location = location.replace(/^l[']\s*/i, '').replace(/^la\s+/i, '');

      location = location.trim().replace(/(?:^|\s|["'([{])+\S/g, match => match.toUpperCase());

      if (locationCount[location]) {
        locationCount[location]++;
      } else {
        locationCount[location] = 1;
      }
    }
  });

  return Object.fromEntries(Object.entries(locationCount).sort());
};

// A marker word matches as a whole word, singular or plural; anything else (emojis) anywhere.
const hasMarker = (text: string, marker: string): boolean =>
  /^[\p{L}\d]+$/u.test(marker) ? new RegExp(`\\b${escapeRegExp(marker)}s?\\b`, 'iu').test(text) : text.includes(marker);

// Notes live in either field depending on how the ride was written up.
const getNotes = (meta?: DetailedActivity | null): string =>
  [meta?.private_note ?? '', meta?.description ?? ''].join('\n');

/**
 * The group a club ride was in: from a marker in the name, description or private note
 * when there is one (first match wins), otherwise from the usual "<club> #123 G2" naming.
 */
const extractNPGroup = (activityName: string, meta: DetailedActivity | null | undefined, club: ClubRules): string => {
  const fullText = `${activityName}\n${getNotes(meta)}`;
  const marked = Object.entries(club.markers).find(([, markers]) => markers.some(marker => hasMarker(fullText, marker)));

  if (marked) return marked[0];

  const renamed = (club.renames ?? []).reduce((name, [from, to]) => name.replace(from, to), activityName);

  return renamed.match(new RegExp(`${escapeRegExp(club.name)}\\s+#\\d+\\s+([A-Za-z0-9.-\\s]+)`))?.[1].trim() || 'Unknown';
};

export {computeFinishCount, extractNPGroup, isClubRide};
export type {ClubRules};
