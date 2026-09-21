import {useMemo} from 'react';
import {Box, BoxProps} from '@chakra-ui/react';
import 'leaflet/dist/leaflet.css';
import {LatLngExpression} from 'leaflet';
import {GeoJSON, MapContainer, Polyline, TileLayer} from 'react-leaflet';
import type {Feature, FeatureCollection, MultiPolygon, Polygon} from 'geojson';
import {ExplorerTiles, Tile, tileBounds} from '../../models';

const TILE_URL =
  'https://tile.jawg.io/jawg-dark/{z}/{x}/{y}{r}.png?access-token=MAP_TOKEN_REMOVED';
const NANTES: LatLngExpression = [47.23, -1.55];
const STRAVA_ORANGE = '#fc4c02';
// Faint enough that a road ridden once barely shows and a daily one glows.
const TRACK_OPACITY = 0.16;
const TRACK_WEIGHT = 1.5;
// A light grid for explored tiles, the yard tinted, the übersquadrat outlined.
const TILE_STYLE = {color: '#ffffff', weight: 0.5, opacity: 0.35, fillColor: '#ffffff', fillOpacity: 0.07};
const YARD_STYLE = {color: '#1D9E75', weight: 0.5, opacity: 0.6, fillColor: '#1D9E75', fillOpacity: 0.22};
const SQUARE_STYLE = {color: '#ffd966', weight: 2.5, opacity: 0.95, fill: false};

// GeoJSON wants [longitude, latitude], the opposite of Leaflet.
const tileRing = ([x, y]: Tile, zoom: number): number[][] => {
  const [[south, west], [north, east]] = tileBounds(x, y, zoom);

  return [
    [west, south],
    [east, south],
    [east, north],
    [west, north],
    [west, south],
  ];
};

const tilesToFeature = (tiles: Tile[], zoom: number): Feature<MultiPolygon> => ({
  type: 'Feature',
  properties: {},
  geometry: {type: 'MultiPolygon', coordinates: tiles.map(tile => [tileRing(tile, zoom)])},
});

const squareToFeature = (square: NonNullable<ExplorerTiles['square']>, zoom: number): Feature<Polygon> => {
  const [[south, west]] = tileBounds(square.x, square.y + square.size - 1, zoom);
  const [, [north, east]] = tileBounds(square.x + square.size - 1, square.y, zoom);

  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [west, south],
          [east, south],
          [east, north],
          [west, north],
          [west, south],
        ],
      ],
    },
  };
};

const collection = (features: Feature[]): FeatureCollection => ({type: 'FeatureCollection', features});

type RideHeatmapProps = {
  tracks: number[][][];
  explorer: ExplorerTiles;
  zoom?: number;
} & BoxProps;

const RideHeatmap = ({tracks, explorer, zoom = 9, ...boxProps}: RideHeatmapProps) => {
  // One GeoJSON layer per kind, instead of thousands of rectangle components.
  const layers = useMemo(
    () => ({
      tiles: collection([tilesToFeature(explorer.tiles, explorer.zoom)]),
      yard: collection(explorer.yard.length > 0 ? [tilesToFeature(explorer.yard, explorer.zoom)] : []),
      square: collection(null === explorer.square ? [] : [squareToFeature(explorer.square, explorer.zoom)]),
    }),
    [explorer],
  );

  return (
    <Box {...boxProps}>
      {/* Canvas instead of one SVG node per ride: there are hundreds of them. */}
      <MapContainer
        center={NANTES}
        zoom={zoom}
        scrollWheelZoom={false}
        preferCanvas={true}
        style={{height: '100%', width: '100%', borderRadius: '8px'}}
      >
        <TileLayer url={TILE_URL} />
        {/* GeoJSON only reads its data once, so the keys force a redraw when the tiles change. */}
        <GeoJSON key={`tiles-${explorer.explored}`} data={layers.tiles} style={TILE_STYLE} />
        <GeoJSON key={`yard-${explorer.yard.length}`} data={layers.yard} style={YARD_STYLE} />
        {tracks.map((points, index) => (
          <Polyline
            key={index}
            positions={points as LatLngExpression[]}
            pathOptions={{color: STRAVA_ORANGE, weight: TRACK_WEIGHT, opacity: TRACK_OPACITY}}
          />
        ))}
        <GeoJSON key={`square-${explorer.maxSquare}`} data={layers.square} style={SQUARE_STYLE} />
      </MapContainer>
    </Box>
  );
};

export {RideHeatmap};
