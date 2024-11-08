import {useState, ReactNode, createContext} from 'react';

const EnvContext = createContext<[boolean, (devMode: boolean) => void]>([true, () => {}]);

type EnvProviderProps = {
  children?: ReactNode;
};

const EnvProvider = ({children}: EnvProviderProps) => {
  const [devMode, setDevMode] = useState<boolean>(true);

  return <EnvContext.Provider value={[devMode, setDevMode]}>{children}</EnvContext.Provider>;
};

export {EnvProvider, EnvContext};
