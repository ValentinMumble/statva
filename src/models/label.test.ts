import {extractEmoji} from './label';

test('it can extract an emoji from a text', () => {
  expect(extractEmoji('nice 🚲 here')).toBe('🚲');
  expect(extractEmoji('🩲 nice here')).toBe('🩲');
  expect(extractEmoji('nice here 🎡')).toBe('🎡');
  // expect(extractEmoji('nice h☕️ere ')).toBe('☕️'); //TODO
  // expect(extractEmoji('🏜️')).toBe('🏜️');
  expect(extractEmoji('📍')).toBe('📍');
  expect(extractEmoji('no emoji')).toBe('');
  expect(extractEmoji('')).toBe('');
});
