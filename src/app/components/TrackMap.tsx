import 'leaflet/dist/leaflet.css';
import {useEffect} from 'react';
import {Box, BoxProps} from '@chakra-ui/react';
import {LatLngBounds, LatLngExpression} from 'leaflet';
import {CircleMarker, MapContainer, Polyline, TileLayer, useMap} from 'react-leaflet';
import {useTheme} from 'next-themes';

// Esri's gray canvas maps need no key; they ask for this credit line.
const ATTRIBUTION = 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ';
const tileUrl = (dark: boolean) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/${dark ? 'World_Dark_Gray_Base' : 'World_Light_Gray_Base'}/MapServer/tile/{z}/{y}/{x}`;
const TRACK_COLOR = '#f25c14';

const FitToTracks = ({tracks, center}: {tracks: number[][][]; center: [number, number]}) => {
  const map = useMap();
  const points = tracks.flat();
  const key = `${points.length}:${points[0]?.join(',')}:${points.at(-1)?.join(',')}`;

  useEffect(() => {
    const fit = () => {
      // The map is created before its box has its final size, so it measures again first.
      // Without animation: refits during layout would otherwise cut each other's zoom short.
      map.invalidateSize({animate: false});
      if (0 === points.length) map.setView(center, 11, {animate: false});
      else map.fitBounds(new LatLngBounds(points as LatLngExpression[]), {padding: [24, 24], animate: false});
    };
    const observer = new ResizeObserver(fit);
    observer.observe(map.getContainer());

    return () => observer.disconnect();
    // Refit only when the tracks themselves change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);

  return null;
};

type TrackMapProps = BoxProps & {
  tracks: number[][][];
  center: [number, number];
  showEnds?: boolean;
  children?: React.ReactNode;
};

/** One or more tracks on a map that follows the light or dark theme. */
const TrackMap = ({tracks, center, showEnds = true, children, ...boxProps}: TrackMapProps) => {
  const {resolvedTheme} = useTheme();
  const dark = 'dark' === resolvedTheme;
  const single = 1 === tracks.length ? tracks[0] : null;

  return (
    <Box borderRadius="card" overflow="hidden" borderWidth="1px" {...boxProps}>
      <MapContainer center={center} zoom={11} scrollWheelZoom={false} style={{height: '100%', width: '100%'}}>
        <TileLayer key={String(dark)} url={tileUrl(dark)} attribution={ATTRIBUTION} />
        <FitToTracks tracks={tracks} center={center} />
        {tracks.map((track, index) => (
          <Polyline
            key={index}
            positions={track as LatLngExpression[]}
            pathOptions={{color: TRACK_COLOR, weight: single ? 3.5 : 1.5, opacity: single ? 0.95 : 0.35}}
          />
        ))}
        {showEnds && null !== single && 0 < single.length && (
          <>
            <CircleMarker center={single[0] as LatLngExpression} radius={6} pathOptions={{color: 'white', weight: 2, fillColor: '#22c55e', fillOpacity: 1}} />
            <CircleMarker center={single[single.length - 1] as LatLngExpression} radius={6} pathOptions={{color: 'white', weight: 2, fillColor: '#111', fillOpacity: 1}} />
          </>
        )}
        {children}
      </MapContainer>
    </Box>
  );
};

export {TrackMap};
