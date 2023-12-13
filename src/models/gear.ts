const GEARS: {[id: string]: {label: string; value: string}} = {
  b12655849: {
    value: 'b12655849',
    label: '🐈‍⬛',
  },
  b13440652: {
    value: 'b13440652',
    label: '🦈',
  },
  b11897955: {
    value: 'b11897955',
    label: '🦖',
  },
  b3121762: {
    value: 'b3121762',
    label: '🐝',
  },
  b2391730: {
    value: 'b2391730',
    label: '🦎',
  },
  b2417181: {
    value: 'b2417181',
    label: '🫐',
  },
  b13424500: {
    value: 'b13424500',
    label: '🤖',
  },
  null: {value: 'null', label: '🤷'},
};

const gearLabel = (gearId: string): string => GEARS[gearId]?.label ?? '🤷';

export {GEARS, gearLabel};
