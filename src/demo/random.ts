/** A small seeded random generator (mulberry32), so the demo is the same on every load. */
const seeded = (seed: number) => {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);

    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    between: (min: number, max: number): number => min + next() * (max - min),
    integer: (min: number, max: number): number => Math.floor(min + next() * (max - min + 1)),
    chance: (probability: number): boolean => next() < probability,
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)],
  };
};

type Random = ReturnType<typeof seeded>;

export {seeded};
export type {Random};
