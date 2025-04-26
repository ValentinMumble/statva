import {Box, BoxProps} from '@chakra-ui/react';
import 'leaflet/dist/leaflet.css';
import {LatLngBounds, LatLngExpression} from 'leaflet';
import {MapContainer, Polyline, TileLayer, useMap} from 'react-leaflet';
import {decodePolyline} from '../models';
import {EmojiMarker} from './leaflet';

const TILE_URL =
  'https://tile.jawg.io/jawg-dark/{z}/{x}/{y}{r}.png?access-token=MAP_TOKEN_REMOVED';
const NANTES: LatLngExpression = [47.23, -1.55];
const STRAVA_ORANGE = '#fc4c02';

type MapBoxProps = {
  polyline: LatLngExpression[];
};

const MapBox = ({polyline}: MapBoxProps) => {
  const bounds = new LatLngBounds(polyline);
  const map = useMap();
  map.fitBounds(bounds);
  map.zoomControl.setPosition('topright')

  return null;
};

type PolylineMapProps = {
  polyline: string | undefined;
} & BoxProps;

const PolylineMap = ({polyline, children, ...boxProps}: PolylineMapProps) => {
  const decodedPolyline = polyline ? (decodePolyline(polyline) as LatLngExpression[]) : [NANTES];

  return (
    <Box {...boxProps}>
      <MapContainer scrollWheelZoom={false} style={{height: '100%', width: '100%'}}>
        <TileLayer url={TILE_URL} />
        <MapBox polyline={decodedPolyline} />
        <Polyline pathOptions={{color: STRAVA_ORANGE}} positions={decodedPolyline} />
        <EmojiMarker position={decodedPolyline.at(0) ?? NANTES} emoji="🌱" />
        <EmojiMarker position={decodedPolyline.at(-1) ?? NANTES} emoji="🏁" />
        {children}
      </MapContainer>
    </Box>
  );
};

export {PolylineMap};
