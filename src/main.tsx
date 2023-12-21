import ReactDOM from 'react-dom/client';
import {ChakraProvider, ThemeConfig, extendTheme} from '@chakra-ui/react';
import {App} from './App.tsx';
import {ActivitiesProvider, AthleteProvider} from './providers';

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

const theme = extendTheme({config});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ChakraProvider theme={theme}>
    <AthleteProvider>
      <ActivitiesProvider>
        <App />
      </ActivitiesProvider>
    </AthleteProvider>
  </ChakraProvider>
);
