type RouteShape = {path: string; start: [number, number]; end: [number, number]};

/**
 * Draws a track (latitude, longitude points) as an SVG path inside a square of the given
 * size, keeping its proportions. Longitude is narrowed by the cosine of the latitude, so
 * shapes are not stretched east to west.
 */
const routeShape = (points: number[][], size: number, padding = 4): RouteShape | null => {
  if (points.length < 2) return null;

  const latitude = (points.reduce((total, [lat]) => total + lat, 0) / points.length) * (Math.PI / 180);
  const projected = points.map(([lat, lng]) => [lng * Math.cos(latitude), -lat]);
  const xs = projected.map(([x]) => x);
  const ys = projected.map(([, y]) => y);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const span = Math.max(maxX - minX, maxY - minY) || 1;
  const scale = (size - 2 * padding) / span;
  // Centre the shape in the square.
  const offsetX = padding + (size - 2 * padding - (maxX - minX) * scale) / 2;
  const offsetY = padding + (size - 2 * padding - (maxY - minY) * scale) / 2;
  const place = ([x, y]: number[]): [number, number] => [
    Math.round((offsetX + (x - minX) * scale) * 10) / 10,
    Math.round((offsetY + (y - minY) * scale) * 10) / 10,
  ];
  const placed = projected.map(place);

  return {
    path: placed.map(([x, y], index) => `${0 === index ? 'M' : 'L'}${x} ${y}`).join(' '),
    start: placed[0],
    end: placed[placed.length - 1],
  };
};

export {routeShape};
export type {RouteShape};
