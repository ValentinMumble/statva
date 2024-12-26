import {extractEmoji} from './label';

test.each([
  ['nice 🚲 here', '🚲'],
  ['🩲 nice here', '🩲'],
  ['nice here 🎡', '🎡'],
  ['nice h☕️ere ', '☕️'],
  ['🏜️', '🏜️'],
  ['Aller chercher l’Alpe d’Huez 🐐', '🐐'],
  ['📍', '📍'],
  ['no emoji', ''],
  ['', ''],
])('it can extract an emoji from %s', (input, expected) => {
  expect(extractEmoji(input)).toEqual(expected);
});