import {extractEmoji} from './label';

test.each([
  ['nice 🚲 here', '🚲'],
  ['🩲 nice here', '🩲'],
  ['nice here 🎡', '🎡'],
  // ['nice h☕️ere ', '☕️'], // TODO
  // ['🏜️', '🏜️'],
  ['📍', '📍'],
  ['no emoji', ''],
  ['', ''],
])('it can extract an emoji from %s', (input, expected) => {
  expect(extractEmoji(input)).toEqual(expected);
});