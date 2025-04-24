import {Box} from '@chakra-ui/react';
import 'leaflet/dist/leaflet.css';
import {LatLngBounds, LatLngExpression} from 'leaflet';
import {MapContainer, Polyline, TileLayer, useMap} from 'react-leaflet';
import {decodePolyline} from '../models';

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
  polyline: string | null;
};

const PolylineMap = ({polyline}: PolylineMapProps) => {
  const decodedPolyline = polyline ? (decodePolyline(polyline) as LatLngExpression[]) : [NANTES];

  return (
    <Box width="1000px" height="600px">
      <MapContainer scrollWheelZoom={false} style={{height: '100%', width: '100%'}}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Polyline pathOptions={{color: STRAVA_ORANGE}} positions={decodedPolyline} />
        {/* <Marker position={position}>
          <Popup>
            A pretty CSS3 popup. <br /> Easily customizable.
          </Popup>
        </Marker> */}
        <MapBox polyline={decodedPolyline} />
      </MapContainer>
    </Box>
  );
};

export {PolylineMap};
