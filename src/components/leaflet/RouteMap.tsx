import {Box, BoxProps} from '@chakra-ui/react';
import 'leaflet/dist/leaflet.css';
import {LatLngBounds, LatLngExpression} from 'leaflet';
import {MapContainer, Polyline, TileLayer, useMap} from 'react-leaflet';
import {decodePolyline} from '../../models';
import {EmojiMarker} from './EmojiMarker';
import {Route} from '../../models/strava';

// Esri's gray canvas needs no key; it asks for this credit line.
const TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
const ATTRIBUTION = 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ';
// Only shown for an instant, before a route arrives.
const FALLBACK_CENTER: LatLngExpression = [46.5, 2.5];
const STRAVA_ORANGE = '#fc4c02';

type MapBoxProps = {
  polyline: LatLngExpression[];
};

const MapBox = ({polyline}: MapBoxProps) => {
  const bounds = new LatLngBounds(polyline);
  const map = useMap();
  map.fitBounds(bounds);
  map.zoomControl.setPosition('topright');

  return null;
};

type RouteMapProps = {
  route: Route | undefined;
} & BoxProps;

const RouteMap = ({route, children, ...boxProps}: RouteMapProps) => {
  const polyline = route?.map.summary_polyline;
  const decodedPolyline = polyline ? (decodePolyline(polyline) as LatLngExpression[]) : [FALLBACK_CENTER];

  return (
    <Box {...boxProps}>
      <MapContainer scrollWheelZoom={false} style={{height: '100%', width: '100%'}}>
        <TileLayer url={TILE_URL} attribution={ATTRIBUTION} />
        <MapBox polyline={decodedPolyline} />
        <Polyline pathOptions={{color: STRAVA_ORANGE}} positions={decodedPolyline} />
        <EmojiMarker position={decodedPolyline.at(0) ?? FALLBACK_CENTER} emoji="🌱" />
        <EmojiMarker position={decodedPolyline.at(-1) ?? FALLBACK_CENTER} emoji="🏁" />
        {children}
      </MapContainer>
    </Box>
  );
};

export {RouteMap};
