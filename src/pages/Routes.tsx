import {HStack, VStack} from '@chakra-ui/react';
import {useRoutes} from '../hooks';
import {useState} from 'react';
import {PolylineMap} from '../components';

const Routes = () => {
  const routes = useRoutes();
  const [selectedRoute, setSelectedRoute] = useState<number | null>(null);

  return (
    <HStack>
      <VStack>
        {routes.map(route => (
          <div onClick={() => setSelectedRoute(route.id)} key={route.id}>
            {route.name}
          </div>
        ))}
      </VStack>
      <VStack>
        {selectedRoute && (
          <div>
            <PolylineMap />
          </div>
        )}
      </VStack>
    </HStack>
  );
};

export {Routes};
