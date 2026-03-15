import {DetailedActivity} from './strava';

const REPLACEMENTS: [string, string][] = [
  ['\u2019', "'"],
  ['\u2018', "'"],
  ['cependant', ''],
];

const computeFinishCount = (rideMeta: DetailedActivity[]): Record<string, number> => {
  const locationCount: Record<string, number> = {};

  rideMeta.forEach(activity => {
    if (!activity.name.includes('N-Peloton')) {
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

const extractNPGroup = (activityName: string): string => {
  if (activityName.includes('🏴‍☠️')) return 'Pirate';

  return (
    activityName
      .replace('préchauffé', '')
      .replace('précramé', '')
      .replace('Chill 1', 'C1')
      .match(/N-Peloton\s+#\d+\s+([A-Za-z0-9.-\s]+)/)?.[1]
      .trim() || 'Unknown'
  );
};

export {computeFinishCount, extractNPGroup};
