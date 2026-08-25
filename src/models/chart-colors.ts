// Categorical palette for the Chakra/recharts charts. Chakra color tokens, so the
// charts follow the theme instead of the hardcoded hex palette the Apex charts use.
// Ordered so neighbouring entries stay easy to tell apart, and red is left out:
// it reads as an alert rather than just another category.
const SERIES_COLORS = [
  'orange.solid',
  'teal.solid',
  'purple.solid',
  'yellow.solid',
  'blue.solid',
  'pink.solid',
  'green.solid',
  'cyan.solid',
  'gray.solid',
];

// Single-hue ramp for stacked periods of the same entity (chain rotations, part periods).
const PERIOD_COLORS = ['orange.700', 'orange.600', 'orange.500', 'orange.400', 'orange.300', 'orange.200'];

const getSeriesColor = (index: number): string => SERIES_COLORS[index % SERIES_COLORS.length];
const getPeriodColor = (index: number): string => PERIOD_COLORS[index % PERIOD_COLORS.length];

export {getPeriodColor, getSeriesColor, PERIOD_COLORS, SERIES_COLORS};
