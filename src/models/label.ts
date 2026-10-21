import {createListCollection} from '@chakra-ui/react';

const EMOJI_REGEX = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})(\u200D)*|\uFE0F/gu;

type Labels = {
  [key: string]: string;
};

type GetLabel = (key: string | null, emojiOnly?: boolean) => string;

/** What every rider sees before renaming anything: column headers, parts, sports and periods. */
const DEFAULT_LABELS: Labels = {
  achievement_count: '🎖️',
  athlete_count: '🧑‍🤝‍🧑',
  average_cadence: '🎡',
  average_heartrate: '🫀',
  average_speed: '🏁',
  average_temp: '🌡️',
  average_watts: '⚡️',
  date: '📅',
  distance: '📍',
  elapsed_time: '⏳',
  elevation_percent: '⚖️',
  intensity: '🔋',
  kilojoules: '🍕',
  kudos_count: '👍',
  max_heartrate: '💗',
  max_speed: '🚀',
  max_watts: '💥',
  moving_time: '⏱️',
  normalized_power: '⚡️®',
  photo_count: '🖼️',
  pr_count: '🏆',
  suffer_score: '🌶️',
  total_elevation_gain: '⛰️',
  weighted_average_watts: '🏋️',
  battery: '🔋',
  brake_bleed: '🚰',
  brake_pad: '🧇',
  cassette: '⚙️',
  chain: '🔗',
  fall: '💥',
  puncture: '🩹',
  saddle: '💺',
  tire: '🛞',
  Ride: '🚲',
  GravelRide: '🪨',
  VirtualRide: '🤖',
  Run: '👟',
  TrailRun: '🏃',
  Hike: '🥾',
  Swim: '🩲',
  Tennis: '🎾',
  day: '🅳',
  week: '🆆',
  month: '🅼',
  year: '🆈',
  Unknown: '🤷',
};

const labelCollection = (items: string[], label: GetLabel) =>
  createListCollection({
    items: items.map(item => ({value: item, label: label(item)})),
  });

const extractEmoji = (text: string): string => text.match(EMOJI_REGEX)?.join('') ?? '';

// Unicode ranges for visually distinct, single-codepoint emojis
const EMOJI_RANGES: [number, number][] = [
  [0x1f300, 0x1f3ce], // weather, nature, food, objects, celebration, sports
  [0x1f400, 0x1f4a9], // animals, symbols
  [0x1f525, 0x1f53d], // fire, shapes
  [0x1f600, 0x1f64f], // faces
  [0x1f680, 0x1f6a2], // transport
  [0x1f910, 0x1f93a], // more faces, sports
  [0x1f950, 0x1f9ff], // food, animals, people
  [0x1fa70, 0x1faff], // newer emojis (coral, lungs, beans, etc.)
];

const randomFromRange = (): string => {
  const range = EMOJI_RANGES[Math.floor(Math.random() * EMOJI_RANGES.length)];
  const codePoint = range[0] + Math.floor(Math.random() * (range[1] - range[0] + 1));

  return String.fromCodePoint(codePoint);
};

// The ranges hold a few symbols that are no emoji (🎕) and some unassigned code points: only
// characters shown as an emoji by default are kept, so a picked one counts as an emoji too.
const isShownAsEmoji = (character: string): boolean => /^\p{Emoji_Presentation}$/u.test(character);

const getRandomUnusedEmoji = (usedEmojis: Set<string>): string => {
  let fallback = '🚲';

  for (let attempt = 0; attempt < 200; attempt++) {
    const emoji = randomFromRange();
    if (!isShownAsEmoji(emoji)) continue;
    if (!usedEmojis.has(emoji)) return emoji;
    fallback = emoji;
  }

  return fallback;
};

/**
 * Whether a name holds an emoji. Plain digits and # count as \p{Emoji}, so this looks for
 * pictographs, the letter pairs flags are made of, and keycaps (a digit, # or * followed
 * by the keycap mark, like 2️⃣).
 */
const hasEmoji = (text: string): boolean =>
  /\p{Extended_Pictographic}|\p{Regional_Indicator}|[0-9#*]\uFE0F?\u20E3/u.test(text);

export {DEFAULT_LABELS, extractEmoji, getRandomUnusedEmoji, hasEmoji, labelCollection};
export type {Labels, GetLabel};
