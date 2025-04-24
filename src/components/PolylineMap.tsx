import {Box} from '@chakra-ui/react';
import 'leaflet/dist/leaflet.css';
import {LatLngBounds, LatLngExpression} from 'leaflet';
import {MapContainer, Polyline, TileLayer, useMap} from 'react-leaflet';
import {decodePolyline} from '../models';
import {EmojiMarker} from './leaflet';

const TILE_URL =
  'https://tile.jawg.io/jawg-dark/{z}/{x}/{y}{r}.png?access-token=MAP_TOKEN_REMOVED';
const NANTES: LatLngExpression = [47.218371, -1.553621];
const STRAVA_ORANGE = '#fc4c02';

type MapBoxProps = {
  polyline: LatLngExpression[];
};

const MapBox = ({polyline}: MapBoxProps) => {
  const bounds = new LatLngBounds(polyline);
  const map = useMap();
  map.fitBounds(bounds);

  return null;
};

type PolylineMapProps = {
  polyline: string | undefined;
};

const PolylineMap = ({polyline}: PolylineMapProps) => {
  const decodedPolyline = polyline ? (decodePolyline(polyline) as LatLngExpression[]) : [NANTES];

  return (
    <Box width="1000px" height="600px">
      <MapContainer scrollWheelZoom={false} style={{height: '100%', width: '100%'}}>
        <TileLayer url={TILE_URL} />
        <MapBox polyline={decodedPolyline} />
        <Polyline pathOptions={{color: STRAVA_ORANGE}} positions={decodedPolyline} />
        <EmojiMarker position={decodedPolyline.at(0)} emoji="📍" />
        <EmojiMarker position={decodedPolyline.at(-1)} emoji="🏁" />
      </MapContainer>
    </Box>
  );
};

export {PolylineMap};
