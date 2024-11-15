import {createListCollection} from '@chakra-ui/react';

type Labels = {
  [key: string]: string;
};

type GetLabel = (key: string | null, emojiOnly?: boolean) => string;

const labelCollection = (items: string[], label: GetLabel, emojiOnly?: boolean) =>
  createListCollection({
    items: items.map(item => ({value: item, label: label(item, emojiOnly)})),
  });

const extractEmoji = (text: string): string =>
  text
    .match(/\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff]/g)
    ?.join('')
    .trim() ?? '';

export {extractEmoji, labelCollection};
export type {Labels, GetLabel};
