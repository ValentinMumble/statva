import {divIcon, LatLngExpression} from 'leaflet';
import {Marker} from 'react-leaflet';

type EmojiMarkerProps = {
  position: LatLngExpression | undefined;
  emoji: string;
};

const EmojiMarker = ({position, emoji}: EmojiMarkerProps) => {
  if (!position) {
    return null;
  }

  const icon = divIcon({
    className: 'map-marker',
    html: emoji,
  });

  return <Marker position={position} icon={icon} />;
};

export {EmojiMarker};
