import {divIcon} from 'leaflet';
import {Marker, MarkerProps, Popup} from 'react-leaflet';

type EmojiMarkerProps = {
  emoji: string;
  popup?: string;
} & MarkerProps;

const EmojiMarker = ({position, emoji, popup, ...rest}: EmojiMarkerProps) => {
  return (
    <Marker
      position={position}
      icon={divIcon({
        className: 'map-marker',
        iconSize: [40, 40],
        html: emoji,
      })}
      {...rest}
    >
      {popup && <Popup>{popup}</Popup>}
    </Marker>
  );
};

export {EmojiMarker};
export type {EmojiMarkerProps};