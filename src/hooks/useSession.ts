import {useQuery} from '@tanstack/react-query';

const isDev = import.meta.env.MODE === 'development';

/** Whether a rider is logged in. Local development runs on the local data files, without a login. */
const useSession = () => {
  const {data, isLoading} = useQuery({
    queryKey: ['session'],
    queryFn: async () => (await fetch('/api/auth/me')).ok,
    enabled: !isDev,
    retry: false,
  });

  return {isLoggedIn: isDev || true === data, isLoading: !isDev && isLoading};
};

export {useSession};
