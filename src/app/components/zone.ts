// Text colours for a zone's palette name (from getZoneColor), readable on both themes.
const PALETTE_COLOR: Record<string, string> = {
  blue: 'blue.fg',
  green: 'green.fg',
  yellow: 'yellow.fg',
  orange: 'orange.fg',
  red: 'red.fg',
  purple: 'purple.fg',
};

const zoneTextColor = (palette: string | undefined): string =>
  undefined === palette ? 'fg' : (PALETTE_COLOR[palette] ?? 'fg');

export {zoneTextColor};
