import {useQuery} from '@tanstack/react-query';
import {isDemo} from '../demo/mode';

/** Whether a rider is logged in, and who. The demo needs no login. */
const useSession = () => {
  const demo = isDemo();
  const {data, isLoading} = useQuery({
    queryKey: ['session'],
    queryFn: async (): Promise<string | null> => {
      const response = await fetch('/api/auth/me');
      if (!response.ok) return null;

      return ((await response.json()) as {athleteId: string}).athleteId;
    },
    enabled: !demo,
    retry: false,
  });

  return {
    isLoggedIn: demo || 'string' === typeof data,
    athleteId: demo ? null : (data ?? null),
    isLoading: !demo && isLoading,
    isDemo: demo,
  };
};

export {useSession};
