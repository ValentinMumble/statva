import {useQuery} from '@tanstack/react-query';
import {isDemo} from '../demo/mode';

// The rider of the last visit, so the app opens on their kept activities with no network.
const ATHLETE_KEY = 'statva-athlete';

const keptAthlete = (): string | null => {
  try {
    return localStorage.getItem(ATHLETE_KEY);
  } catch {
    return null;
  }
};

const keepAthlete = (athleteId: string | null) => {
  try {
    if (null === athleteId) localStorage.removeItem(ATHLETE_KEY);
    else localStorage.setItem(ATHLETE_KEY, athleteId);
  } catch {
    // Storage refused: an open with no network shows the login screen.
  }
};

/**
 * Whether a rider is logged in, and who. The demo needs no login. With no network (or a Wi-Fi
 * login page in the way), the rider of the last visit: the server says who it is next time.
 */
const useSession = () => {
  const demo = isDemo();
  const {data, isLoading} = useQuery({
    queryKey: ['session'],
    queryFn: async (): Promise<string | null> => {
      let response: Response;
      try {
        response = await fetch('/api/auth/me');
      } catch {
        return keptAthlete();
      }
      if (401 === response.status) {
        keepAthlete(null);
        return null;
      }
      if (!response.ok) return null;
      const answer = (await response.json().catch(() => null)) as {athleteId: string} | null;
      if (null === answer) return keptAthlete();
      keepAthlete(answer.athleteId);

      return answer.athleteId;
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
