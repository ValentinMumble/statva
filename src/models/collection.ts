import {createListCollection} from '@chakra-ui/react';

const labelCollection = (items: string[], label: (key: string) => string) =>
  createListCollection({
    items: items.map(item => ({value: item, label: label(item)})),
  });

export {labelCollection};
