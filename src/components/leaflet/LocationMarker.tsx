import {useEffect} from 'react';
import {useMap} from 'react-leaflet';
import {EmojiMarker, EmojiMarkerProps} from './EmojiMarker';

type LocationMarkerProps = {} & EmojiMarkerProps;

const LocationMarker = ({position, ...rest}: LocationMarkerProps) => {
  const map = useMap();

  useEffect(() => {
    map.flyTo(position, map.getZoom());
  }, [position]);

  return <EmojiMarker position={position} {...rest} />;
};

export {LocationMarker};
