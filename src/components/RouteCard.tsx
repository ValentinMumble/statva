import {Card} from '@chakra-ui/react';
import {Route} from '../models/strava';
import {CheckIn, formatDistance, formatDuration, formatDistanceMeters, getCheckInText} from '../models';
import {useLabels} from '../hooks';

type RouteCardProps = {
  route: Route | undefined;
  checkIns: CheckIn[];
};

const RouteCard = ({route, checkIns}: RouteCardProps) => {
  const {label} = useLabels();
  const lastCheckIn = checkIns.at(-1);

  if (!route) {
    return null;
  }

  return (
    <Card.Root backgroundColor="blackAlpha.800">
      <Card.Body gap="10px">
        <Card.Title>{route.name}</Card.Title>
        <Card.Description lineHeight="25px">
          {label('distance')} {formatDistance(route.distance)}
          <br />
          {label('total_elevation_gain')} {formatDistanceMeters(route.elevation_gain)}
          <br />
          {label('moving_time')} ~{formatDuration(route.estimated_moving_time)} estimated
          <br />
          {label('date')} Created on {new Date(route.created_at).toLocaleDateString('fr-FR')}
          <br />
          📌 {lastCheckIn ? <>{getCheckInText(lastCheckIn, true)}</> : 'No check-in'}
          <br />
        </Card.Description>
      </Card.Body>
    </Card.Root>
  );
};

export {RouteCard};
