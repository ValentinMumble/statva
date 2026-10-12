import {useQuery} from '@tanstack/react-query';
import {isDemo} from '../demo/mode';

/** Whether a rider is logged in. The demo needs no login. */
const useSession = () => {
  const demo = isDemo();
  const {data, isLoading} = useQuery({
    queryKey: ['session'],
    queryFn: async () => (await fetch('/api/auth/me')).ok,
    enabled: !demo,
    retry: false,
  });

  return {isLoggedIn: demo || true === data, isLoading: !demo && isLoading, isDemo: demo};
};

export {useSession};
