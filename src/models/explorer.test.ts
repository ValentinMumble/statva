import {computeExplorerTiles, tileBounds} from './explorer';

// Nantes sits around 47.23 N, -1.55 E. At zoom 14 a tile is roughly 2.4 km wide here,
// so points a few hundredths of a degree apart land in different tiles.
const NANTES = [47.23, -1.55];

test('it counts nothing for no tracks', () => {
  expect(computeExplorerTiles([])).toEqual({zoom: 14, explored: 0, maxSquare: 0, tiles: [], square: null, cluster: []});
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
  const {explored} = computeExplorerTiles([[NANTES, [48.85, 2.35], [41.9, 12.5]]]);

  expect(explored).toBe(3);
});

// Build tracks from tile coordinates directly, so the shapes under test are exact.
const fromTiles = (tiles: [number, number][], zoom = 14): number[][][] => {
  const scale = 2 ** zoom;

  return [
    tiles.map(([x, y]) => {
      const longitude = (x / scale) * 360 - 180 + 0.001;
      const n = Math.PI - (2 * Math.PI * y) / scale;
      const latitude = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))) - 0.001;

      return [latitude, longitude];
    }),
  ];
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

test('a cluster tile needs all four neighbours, so a three by three block has one', () => {
  const block: [number, number][] = [];
  for (let x = 0; x < 3; x++) {
    for (let y = 0; y < 3; y++) block.push([20 + x, 20 + y]);
  }

  expect(computeExplorerTiles(fromTiles(block)).cluster).toEqual([[21, 21]]);
});

test('the max cluster is the biggest connected group of cluster tiles', () => {
  // a 4x4 block gives an inner 2x2 of cluster tiles; a lone 3x3 elsewhere gives one
  const big: [number, number][] = [];
  for (let x = 0; x < 4; x++) {
    for (let y = 0; y < 4; y++) big.push([20 + x, 20 + y]);
  }
  const small: [number, number][] = [];
  for (let x = 0; x < 3; x++) {
    for (let y = 0; y < 3; y++) small.push([50 + x, 50 + y]);
  }

  const {cluster} = computeExplorerTiles(fromTiles([...big, ...small]));

  expect(cluster).toHaveLength(4);
  expect(cluster.map(([x, y]) => `${x}/${y}`).sort()).toEqual(['21/21', '21/22', '22/21', '22/22']);
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
