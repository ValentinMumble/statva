/**
 * Routes from prendslaroue.fr's GPX tool (https://www.prendslaroue.fr/gpxtool/<id>). Its GPX file
 * cannot be read from the browser (the site does not allow other sites to), so the server reads it
 * for Ride weather: only from that site, only a route's file.
 */

const GPX_TOOL_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Thrown when prendslaroue.fr has no such route, or answers with something else than a GPX file. */
class GpxToolError extends Error {}

type GpxPoint = {lat: number; lng: number; alt?: number};

const XML_ENTITIES: Record<string, string> = {amp: '&', lt: '<', gt: '>', quot: '"', apos: "'"};

/** A GPX text's characters, as written: `Caf&#233;` is Café. */
const decodeXml = (text: string): string =>
  text.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (match, entity: string) => {
    if (entity.startsWith('#x') || entity.startsWith('#X')) return String.fromCodePoint(parseInt(entity.slice(2), 16));
    if (entity.startsWith('#')) return String.fromCodePoint(Number(entity.slice(1)));
    return XML_ENTITIES[entity] ?? match;
  });

const attribute = (attributes: string, name: string): number =>
  Number(attributes.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`))?.[1]);

/** A GPX file's track (or route, when it has no track): its name and points, with their height when it says. */
const parseGpx = (gpx: string): {name: string; points: GpxPoint[]} => {
  const read = (tag: string): GpxPoint[] =>
    [...gpx.matchAll(new RegExp(`<${tag}\\b([^>]*?)(?:/>|>([\\s\\S]*?)</${tag}>)`, 'g'))]
      .map(([, attributes, inside = '']) => {
        const altitude = Number(inside.match(/<ele>\s*([^<]+?)\s*<\/ele>/)?.[1]);
        return {
          lat: attribute(attributes, 'lat'),
          lng: attribute(attributes, 'lon'),
          ...(Number.isFinite(altitude) ? {alt: altitude} : {}),
        };
      })
      .filter(({lat, lng}) => Number.isFinite(lat) && Number.isFinite(lng));
  const track = read('trkpt');
  const named = gpx.match(/<(?:trk|rte)>\s*<name>([^<]*)<\/name>/)?.[1] ?? gpx.match(/<name>([^<]*)<\/name>/)?.[1];

  return {
    name: decodeXml(named ?? '').trim() || 'Prends la roue route',
    points: 0 < track.length ? track : read('rtept'),
  };
};

/** A route of the GPX tool, by its id. */
const gpxToolRoute = async (id: string): Promise<{name: string; points: GpxPoint[]}> => {
  if (!GPX_TOOL_ID.test(id)) throw new GpxToolError('Not a route of the GPX tool');
  const response = await fetch(`https://www.prendslaroue.fr/gpxtool/${id}/gpx`);
  if (!response.ok) throw new GpxToolError(`prendslaroue.fr answered ${response.status}`);
  const route = parseGpx(await response.text());
  if (route.points.length < 2) throw new GpxToolError('prendslaroue.fr sent no route');

  return route;
};

export {GPX_TOOL_ID, gpxToolRoute, GpxToolError, parseGpx};
