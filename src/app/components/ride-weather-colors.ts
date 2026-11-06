// Head wind, nothing much, tail wind: two hues and a neutral middle.
const WIND_COLORS = {head: '#e5484d', calm: '#8b8d98', tail: '#12a594'};
// The same, paler, for the arrows on top of the route.
const ARROW_COLORS = {head: '#ffa8a8', calm: '#f2f2f4', tail: '#8ff0d4'};

// The arrow's width and head, as shares of its length: the whole arrow grows with the wind.
const ARROW_WIDTH = 0.45;
const ARROW_SHAFT = 0.1;

/**
 * A wind arrow pointing up, as an SVG path centred in a square as wide as it is long (so it
 * turns about its middle without leaving the square): shaft and head in proportion.
 */
const arrowPath = (length: number): string => {
  const middle = length / 2;
  const half = (length * ARROW_WIDTH) / 2;
  const head = length * ARROW_WIDTH * 0.9;
  const shaft = (length * ARROW_SHAFT) / 2;

  return `M${middle} 0 L${middle + half} ${head} L${middle + shaft} ${head} L${middle + shaft} ${length} L${middle - shaft} ${length} L${middle - shaft} ${head} L${middle - half} ${head} Z`;
};

/** The arrow's length for a wind, in proportion to its speed, held between a floor and a cap. */
const arrowLength = (wind: number, perKmh: number, shortest: number, longest: number): number =>
  Math.round(Math.min(longest, Math.max(shortest, wind * perKmh)));

export {ARROW_COLORS, arrowLength, arrowPath, WIND_COLORS};
