import {CheckIn, getCheckInText} from '../../models';
import {EmojiMarker} from './EmojiMarker';


type CheckInsProps = {
  checkIns: CheckIn[];
};

const CheckIns = ({checkIns}: CheckInsProps) => {
  return (
    <>
      {checkIns.map((checkIn, index) => (
        <EmojiMarker
          key={index}
          opacity={index === checkIns.length - 1 ? 1 : 0.5}
          position={[checkIn.lat, checkIn.lng]}
          emoji="📌"
          popup={getCheckInText(checkIn, index === checkIns.length - 1)}
        />
      ))}
    </>
  );
};

export {CheckIns};
