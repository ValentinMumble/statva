// Categorical palette for the Chakra/recharts charts. Chakra color tokens, so the
// charts follow the theme instead of the hardcoded hex palette the Apex charts use.
const SERIES_COLORS = [
  'orange.solid',
  'teal.solid',
  'yellow.solid',
  'green.solid',
  'purple.solid',
  'pink.solid',
  'red.solid',
  'blue.solid',
  'cyan.solid',
  'gray.solid',
];

// Single-hue ramp for stacked periods of the same entity (chain rotations, part periods).
const PERIOD_COLORS = ['orange.700', 'orange.600', 'orange.500', 'orange.400', 'orange.300', 'orange.200'];

const getSeriesColor = (index: number): string => SERIES_COLORS[index % SERIES_COLORS.length];
const getPeriodColor = (index: number): string => PERIOD_COLORS[index % PERIOD_COLORS.length];

export {getPeriodColor, getSeriesColor, PERIOD_COLORS, SERIES_COLORS};
