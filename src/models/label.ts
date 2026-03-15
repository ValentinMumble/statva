import {createListCollection} from '@chakra-ui/react';

const EMOJI_REGEX = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})(\u200D)*|\uFE0F/gu;

type Labels = {
  [key: string]: string;
};

type GetLabel = (key: string | null, emojiOnly?: boolean) => string;

const labelCollection = (items: string[], label: GetLabel) =>
  createListCollection({
    items: items.map(item => ({value: item, label: label(item)})),
  });

const extractEmoji = (text: string): string => text.match(EMOJI_REGEX)?.join('') ?? '';

// Unicode ranges for visually distinct, single-codepoint emojis
const EMOJI_RANGES: [number, number][] = [
  [0x1F300, 0x1F3CE], // weather, nature, food, objects, celebration, sports
  [0x1F400, 0x1F4A9], // animals, symbols
  [0x1F525, 0x1F53D], // fire, shapes
  [0x1F600, 0x1F64F], // faces
  [0x1F680, 0x1F6A2], // transport
  [0x1F910, 0x1F93A], // more faces, sports
  [0x1F950, 0x1F9FF], // food, animals, people
  [0x1FA70, 0x1FAFF], // newer emojis (coral, lungs, beans, etc.)
];

const randomFromRange = (): string => {
  const range = EMOJI_RANGES[Math.floor(Math.random() * EMOJI_RANGES.length)];
  const codePoint = range[0] + Math.floor(Math.random() * (range[1] - range[0] + 1));

  return String.fromCodePoint(codePoint);
};

const getRandomUnusedEmoji = (usedEmojis: Set<string>): string => {
  for (let i = 0; i < 50; i++) {
    const emoji = randomFromRange();
    if (!usedEmojis.has(emoji)) return emoji;
  }

  return randomFromRange();
};

export {extractEmoji, getRandomUnusedEmoji, labelCollection};
export type {Labels, GetLabel};
