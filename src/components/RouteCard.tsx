import {Card} from '@chakra-ui/react';
import {Route} from '../models/strava';
import {formatDistance, formatDuration, formatElevation} from '../models';
import {useLabels} from '../hooks';

type RouteCardProps = {
  route: Route | undefined;
};

const RouteCard = ({route}: RouteCardProps) => {
  const [label] = useLabels();

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
          {label('total_elevation_gain')} {formatElevation(route.elevation_gain)}
          <br />
          {label('moving_time')} ~{formatDuration(route.estimated_moving_time)} estimated
          <br />
          {label('date')} Created on {new Date(route.created_at).toLocaleDateString()}
        </Card.Description>
      </Card.Body>
    </Card.Root>
  );
};

export {RouteCard};
