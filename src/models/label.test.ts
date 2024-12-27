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
  ['GRVL 120 🦖', '🦖'],
  ['Super6 🦈', '🦈'],
  ['Cervélo R5 🐈‍⬛', '🐈‍⬛'],
])('it can extract the emoji from %s', (input, expected) => {
  expect(extractEmoji(input)).toEqual(expected);
});