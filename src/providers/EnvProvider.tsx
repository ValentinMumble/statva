import {ReactNode, createContext} from 'react';
import {useLocalStorage} from 'usehooks-ts';

const EnvContext = createContext<[boolean, (devMode: boolean) => void]>([true, () => {}]);

type EnvProviderProps = {
  children?: ReactNode;
};

const EnvProvider = ({children}: EnvProviderProps) => {
  const [devMode, setDevMode] = useLocalStorage<boolean>('dev-mode', import.meta.env.DEV);

  return <EnvContext.Provider value={[devMode, setDevMode]}>{children}</EnvContext.Provider>;
};

export {EnvProvider, EnvContext};
