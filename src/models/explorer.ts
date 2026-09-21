// Explorer tiles, the game VeloViewer, StatsHunters and Squadrats made popular: the
// world is cut into the same square tiles a slippy map uses at zoom 14, roughly 2.4 km
// wide around here, and a tile counts as explored once a ride has passed through it.
//   max square : Squadrats' übersquadrat, the biggest block of explored tiles with no hole
//   core tiles : explored tiles whose four neighbours are explored too
//   yard       : Squadrats' yard, the biggest group of core tiles that touch each other
const TILE_ZOOM = 14;

type Tile = [number, number];

type ExplorerTiles = {
  zoom: number;
  explored: number;
  maxSquare: number;
  tiles: Tile[];
  square: {x: number; y: number; size: number} | null;
  core: Tile[];
  yard: Tile[];
};

const tileKey = (x: number, y: number): string => `${x}/${y}`;
const parseKey = (key: string): Tile => key.split('/').map(Number) as Tile;

// Position on the tile grid with the fraction kept, so a segment can be walked exactly.
const toGrid = ([latitude, longitude]: number[], zoom: number): [number, number] => {
  const scale = 2 ** zoom;
  const radians = (latitude * Math.PI) / 180;

  return [
    ((longitude + 180) / 360) * scale,
    ((1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2) * scale,
  ];
};

const toTile = (point: number[], zoom: number): Tile => {
  const [x, y] = toGrid(point, zoom);

  return [Math.floor(x), Math.floor(y)];
};

// Geographic bounds of one tile as [[south, west], [north, east]], which is what Leaflet wants.
const tileBounds = (x: number, y: number, zoom: number): [[number, number], [number, number]] => {
  const scale = 2 ** zoom;
  const longitude = (tileX: number): number => (tileX / scale) * 360 - 180;
  const latitude = (tileY: number): number =>
    (Math.atan(Math.sinh(Math.PI * (1 - (2 * tileY) / scale))) * 180) / Math.PI;

  return [
    [latitude(y + 1), longitude(x)],
    [latitude(y), longitude(x + 1)],
  ];
};

// Largest square of explored tiles, walking the tiles from the far corner back so each
// one can lean on the three neighbours already measured. Keyed on a map rather than a
// grid, because the bounding box of a few foreign trips would be mostly empty.
const findMaxSquare = (tiles: Set<string>): ExplorerTiles['square'] => {
  const squares = new Map<string, number>();
  let best: ExplorerTiles['square'] = null;

  const coordinates = [...tiles].map(parseKey).sort(([xA, yA], [xB, yB]) => xB - xA || yB - yA);

  coordinates.forEach(([x, y]) => {
    const size =
      1 +
      Math.min(
        squares.get(tileKey(x + 1, y)) ?? 0,
        squares.get(tileKey(x, y + 1)) ?? 0,
        squares.get(tileKey(x + 1, y + 1)) ?? 0,
      );

    squares.set(tileKey(x, y), size);
    if (null === best || size > best.size) best = {x, y, size};
  });

  return best;
};

const NEIGHBOURS: Tile[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

// Explored tiles with all four neighbours explored: the only ones that can be in a yard.
const findCore = (tiles: Set<string>): Set<string> =>
  new Set(
    [...tiles].filter(key => {
      const [x, y] = parseKey(key);

      return NEIGHBOURS.every(([dx, dy]) => tiles.has(tileKey(x + dx, y + dy)));
    }),
  );

// The largest group of core tiles that touch along an edge, found with a flood fill.
const findYard = (core: Set<string>): Tile[] => {
  const seen = new Set<string>();
  let largest: Tile[] = [];

  core.forEach(start => {
    if (seen.has(start)) return;

    const group: Tile[] = [];
    const queue = [start];
    seen.add(start);

    while (queue.length > 0) {
      const key = queue.pop() as string;
      const [x, y] = parseKey(key);
      group.push([x, y]);

      NEIGHBOURS.forEach(([dx, dy]) => {
        const next = tileKey(x + dx, y + dy);

        if (core.has(next) && !seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      });
    }

    if (group.length > largest.length) largest = group;
  });

  return largest;
};

// Every tile a straight segment passes through, walked cell by cell along the grid
// (the classic voxel traversal). Sampling points along the segment is not enough: a road
// that clips the corner of a tile between two recorded points never gets a sample there.
const tilesAlong = (from: number[], to: number[], zoom: number, visit: (x: number, y: number) => void) => {
  const [fromX, fromY] = toGrid(from, zoom);
  const [toX, toY] = toGrid(to, zoom);

  if (![fromX, fromY, toX, toY].every(Number.isFinite)) return;

  let x = Math.floor(fromX);
  let y = Math.floor(fromY);
  const endX = Math.floor(toX);
  const endY = Math.floor(toY);
  const deltaX = toX - fromX;
  const deltaY = toY - fromY;
  const stepX = Math.sign(deltaX);
  const stepY = Math.sign(deltaY);
  // How far along the segment (0 to 1) the next vertical and horizontal grid line sit.
  let nextX = 0 === deltaX ? Infinity : ((stepX > 0 ? x + 1 : x) - fromX) / deltaX;
  let nextY = 0 === deltaY ? Infinity : ((stepY > 0 ? y + 1 : y) - fromY) / deltaY;
  const spanX = 0 === deltaX ? Infinity : Math.abs(1 / deltaX);
  const spanY = 0 === deltaY ? Infinity : Math.abs(1 / deltaY);

  visit(x, y);

  // The walk needs exactly one step per grid line crossed; the bound is a safety net.
  let remaining = Math.abs(endX - x) + Math.abs(endY - y);

  while ((x !== endX || y !== endY) && remaining-- > 0) {
    if (nextX < nextY) {
      x += stepX;
      nextX += spanX;
    } else {
      y += stepY;
      nextY += spanY;
    }

    visit(x, y);
  }
};

const computeExplorerTiles = (tracks: number[][][], zoom: number = TILE_ZOOM): ExplorerTiles => {
  const tiles = new Set<string>();
  const visit = (x: number, y: number) => tiles.add(tileKey(x, y));

  tracks.forEach(points => {
    if (1 === points.length) {
      const [x, y] = toTile(points[0], zoom);

      if (Number.isFinite(x) && Number.isFinite(y)) visit(x, y);
    }

    points.forEach((point, index) => {
      const next = points[index + 1];

      if (undefined !== next) tilesAlong(point, next, zoom, visit);
    });
  });

  const square = findMaxSquare(tiles);
  const core = findCore(tiles);

  return {
    zoom,
    explored: tiles.size,
    maxSquare: square?.size ?? 0,
    tiles: [...tiles].map(parseKey),
    square,
    core: [...core].map(parseKey),
    yard: findYard(core),
  };
};

export {computeExplorerTiles, tileBounds, TILE_ZOOM};
export type {ExplorerTiles, Tile};
