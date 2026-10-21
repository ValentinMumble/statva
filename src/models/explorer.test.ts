import {computeExplorerTiles, tileBounds} from './explorer';

// Nantes sits around 47.23 N, -1.55 E. At zoom 14 a tile is roughly 2.4 km wide here,
// so points a few hundredths of a degree apart land in different tiles.
const NANTES = [47.23, -1.55];

test('it counts nothing for no tracks', () => {
  expect(computeExplorerTiles([])).toEqual({
    zoom: 14,
    explored: 0,
    maxSquare: 0,
    tiles: [],
    square: null,
    core: [],
    yard: [],
  });
});

test('it counts one tile for a ride that stays put', () => {
  const {explored, maxSquare} = computeExplorerTiles([[NANTES, NANTES, NANTES]]);

  expect(explored).toBe(1);
  expect(maxSquare).toBe(1);
});

test('it counts a tile once however many rides cross it', () => {
  const {explored} = computeExplorerTiles([[NANTES], [NANTES], [NANTES]]);

  expect(explored).toBe(1);
});

test('it counts separate tiles for points far apart', () => {
  const {explored} = computeExplorerTiles([[NANTES], [[48.85, 2.35]], [[41.9, 12.5]]]);

  expect(explored).toBe(3);
});

// Build tracks from tile coordinates directly, so the shapes under test are exact. Each
// tile becomes its own one-point track: a single track would be interpolated between
// tiles and fill in the gaps the test is trying to leave.
const fromTiles = (tiles: [number, number][], zoom = 14): number[][][] => {
  const scale = 2 ** zoom;

  return tiles.map(([x, y]) => {
    const longitude = (x / scale) * 360 - 180 + 0.001;
    const n = Math.PI - (2 * Math.PI * y) / scale;
    const latitude = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))) - 0.001;

    return [[latitude, longitude]];
  });
};

test('it finds a full two by two block and where it sits', () => {
  const {explored, maxSquare, square} = computeExplorerTiles(
    fromTiles([
      [10, 10],
      [11, 10],
      [10, 11],
      [11, 11],
    ]),
  );

  expect(explored).toBe(4);
  expect(maxSquare).toBe(2);
  expect(square).toEqual({x: 10, y: 10, size: 2});
});

test('it will not count a block with a hole in it', () => {
  // three corners of a two by two, so the biggest solid square is a single tile
  const {explored, maxSquare} = computeExplorerTiles(
    fromTiles([
      [10, 10],
      [11, 10],
      [10, 11],
    ]),
  );

  expect(explored).toBe(3);
  expect(maxSquare).toBe(1);
});

test('it finds the bigger square when a small one sits beside it', () => {
  const block: [number, number][] = [];
  for (let x = 0; x < 3; x++) {
    for (let y = 0; y < 3; y++) block.push([20 + x, 20 + y]);
  }

  const {explored, maxSquare} = computeExplorerTiles(fromTiles([...block, [40, 40]]));

  expect(explored).toBe(10);
  expect(maxSquare).toBe(3);
});

test('a core tile needs all four neighbours, so a three by three block has one', () => {
  const block: [number, number][] = [];
  for (let x = 0; x < 3; x++) {
    for (let y = 0; y < 3; y++) block.push([20 + x, 20 + y]);
  }

  const {core, yard} = computeExplorerTiles(fromTiles(block));

  expect(core).toEqual([[21, 21]]);
  expect(yard).toEqual([[21, 21]]);
});

test('the yard is the biggest connected group of core tiles, and a corridor does not join two', () => {
  // two 4x4 blocks joined by a one tile wide road along their top row: each block has a
  // 2x2 core, and nothing on the road can be core because the row above it is empty
  const left: [number, number][] = [];
  const right: [number, number][] = [];
  for (let x = 0; x < 4; x++) {
    for (let y = 0; y < 4; y++) {
      left.push([20 + x, 20 + y]);
      right.push([40 + x, 20 + y]);
    }
  }
  const road: [number, number][] = [];
  for (let x = 24; x < 40; x++) road.push([x, 20]);

  const {core, yard} = computeExplorerTiles(fromTiles([...left, ...road, ...right]));

  expect(core).toHaveLength(8);
  expect(yard).toHaveLength(4);
  expect(yard.every(([x]) => x < 30 || x >= 40)).toBe(true);
});

test('two lone tiles have no core, so no yard', () => {
  const {explored, core, yard} = computeExplorerTiles(
    fromTiles([
      [10, 10],
      [11, 11],
    ]),
  );

  expect(explored).toBe(2);
  expect(core).toEqual([]);
  expect(yard).toEqual([]);
});

test('it counts every tile along a segment, not just the ones the points land in', () => {
  // a single straight segment whose two points sit five tiles apart on the same row
  const [[west], [east]] = fromTiles([
    [10, 10],
    [15, 10],
  ]);
  const {explored, tiles} = computeExplorerTiles([[west, east]]);

  expect(explored).toBe(6);
  expect(tiles.map(([x]) => x).sort((a, b) => a - b)).toEqual([10, 11, 12, 13, 14, 15]);
});

test('a segment that only clips the corner of a tile still counts that tile', () => {
  // from just inside the south-east corner of tile (10,10) to just inside the north-west
  // corner of tile (11,11): the straight line between them cuts through the corner of a
  // third tile, which point sampling never sees
  const scale = 2 ** 14;
  const toPoint = (x: number, y: number): number[] => {
    const longitude = (x / scale) * 360 - 180;
    const n = Math.PI - (2 * Math.PI * y) / scale;

    return [(180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))), longitude];
  };
  const start = toPoint(10.98, 10.9);
  const end = toPoint(11.02, 11.1);

  const {explored, tiles} = computeExplorerTiles([[start, end]]);

  expect(explored).toBe(3);
  expect(tiles.map(([x, y]) => `${x}/${y}`).sort()).toEqual(['10/10', '11/10', '11/11']);
});

test('a segment straight down a column visits each tile once', () => {
  const scale = 2 ** 14;
  const toPoint = (x: number, y: number): number[] => {
    const longitude = (x / scale) * 360 - 180;
    const n = Math.PI - (2 * Math.PI * y) / scale;

    return [(180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))), longitude];
  };

  const {explored, tiles} = computeExplorerTiles([[toPoint(10.5, 10.5), toPoint(10.5, 14.5)]]);

  expect(explored).toBe(5);
  expect(tiles.map(([, y]) => y).sort((a, b) => a - b)).toEqual([10, 11, 12, 13, 14]);
});

test('tile bounds cover the whole world at zoom zero', () => {
  const [[south, west], [north, east]] = tileBounds(0, 0, 0);

  expect(west).toBe(-180);
  expect(east).toBe(180);
  expect(north).toBeCloseTo(85.05, 1);
  expect(south).toBeCloseTo(-85.05, 1);
});

test('tile bounds round trip a point back into its own tile', () => {
  const {tiles} = computeExplorerTiles([[NANTES]]);
  const [[south, west], [north, east]] = tileBounds(tiles[0][0], tiles[0][1], 14);

  expect(NANTES[0]).toBeGreaterThan(south);
  expect(NANTES[0]).toBeLessThan(north);
  expect(NANTES[1]).toBeGreaterThan(west);
  expect(NANTES[1]).toBeLessThan(east);
});
