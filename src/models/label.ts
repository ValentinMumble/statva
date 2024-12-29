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

export {extractEmoji, labelCollection};
export type {Labels, GetLabel};
