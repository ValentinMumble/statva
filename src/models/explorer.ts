// Explorer tiles, the game VeloViewer and StatsHunters made popular: the world is cut
// into the same square tiles a slippy map uses at zoom 14, roughly 2.4 km wide around
// here, and a tile counts as explored once a ride has passed through it.
//   max square  : the biggest block of explored tiles with no hole in it
//   max cluster : StatsHunters' figure, the largest connected group of tiles whose
//                 four neighbours are all explored too
const TILE_ZOOM = 14;

type Tile = [number, number];

type ExplorerTiles = {
  zoom: number;
  explored: number;
  maxSquare: number;
  tiles: Tile[];
  square: {x: number; y: number; size: number} | null;
  cluster: Tile[];
};

const tileKey = (x: number, y: number): string => `${x}/${y}`;
const parseKey = (key: string): Tile => key.split('/').map(Number) as Tile;

const toTile = ([latitude, longitude]: number[], zoom: number): Tile => {
  const scale = 2 ** zoom;
  const radians = (latitude * Math.PI) / 180;

  return [
    Math.floor(((longitude + 180) / 360) * scale),
    Math.floor(((1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2) * scale),
  ];
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

// A cluster tile has all four neighbours explored. The max cluster is the largest group
// of cluster tiles that touch each other, found with a flood fill.
const findMaxCluster = (tiles: Set<string>): Tile[] => {
  const clusterTiles = new Set(
    [...tiles].filter(key => {
      const [x, y] = parseKey(key);

      return NEIGHBOURS.every(([dx, dy]) => tiles.has(tileKey(x + dx, y + dy)));
    }),
  );

  const seen = new Set<string>();
  let largest: Tile[] = [];

  clusterTiles.forEach(start => {
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

        if (clusterTiles.has(next) && !seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      });
    }

    if (group.length > largest.length) largest = group;
  });

  return largest;
};

const computeExplorerTiles = (tracks: number[][][], zoom: number = TILE_ZOOM): ExplorerTiles => {
  const tiles = new Set<string>();

  tracks.forEach(points =>
    points.forEach(point => {
      const [x, y] = toTile(point, zoom);

      if (Number.isFinite(x) && Number.isFinite(y)) tiles.add(tileKey(x, y));
    }),
  );

  const square = findMaxSquare(tiles);

  return {
    zoom,
    explored: tiles.size,
    maxSquare: square?.size ?? 0,
    tiles: [...tiles].map(parseKey),
    square,
    cluster: findMaxCluster(tiles),
  };
};

export {computeExplorerTiles, tileBounds, TILE_ZOOM};
export type {ExplorerTiles, Tile};
