import {extractEmoji, hasEmoji} from './label';

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
test.each([
  ['Lake loop 🌊', true],
  ['N-Peloton #670 🍍', true],
  ['Lake Geneva 🇨🇭', true],
  ["MyWhoosh - Endurance 12's #2 2️⃣", true],
  ['Intervals 3⃣', true],
  ['Les Copains #670 C1', false],
  ['Afternoon Ride', false],
])('hasEmoji(%s) = %s', (name, expected) => {
  expect(hasEmoji(name)).toBe(expected);
});
