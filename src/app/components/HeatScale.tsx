import {Box, BoxProps, HStack, Text} from '@chakra-ui/react';

// One brand colour mixed into the empty-square colour, so the scale reads from light to
// strong in light mode and from dim to bright in dark mode. Level 0 is an empty square.
const HEAT_COLORS = [
  'bg.muted',
  ...[30, 55, 78, 100].map(
    step => `color-mix(in oklab, var(--chakra-colors-brand-solid) ${step}%, var(--chakra-colors-bg-muted))`,
  ),
];

type HeatCellProps = BoxProps & {level: number};

/** A square of a heatmap, shaded from 0 (nothing) to 4 (the most). */
const HeatCell = ({level, ...props}: HeatCellProps) => (
  <Box aspectRatio="1" borderRadius="2px" background={HEAT_COLORS[level] ?? HEAT_COLORS[0]} {...props} />
);

type HeatLegendProps = {low: string; high: string};

/** The scale under a heatmap, from the empty square to the strongest one. */
const HeatLegend = ({low, high}: HeatLegendProps) => (
  <HStack gap="4px">
    <Text fontSize="10px" color="fg.muted" marginRight="2px">
      {low}
    </Text>
    {HEAT_COLORS.map(color => (
      <Box key={color} width="10px" height="10px" borderRadius="2px" background={color} />
    ))}
    <Text fontSize="10px" color="fg.muted" marginLeft="2px">
      {high}
    </Text>
  </HStack>
);

export {HeatCell, HeatLegend};
