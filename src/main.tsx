import ReactDOM from 'react-dom/client';
import {ChakraProvider, ColorModeScript, ThemeConfig, extendTheme} from '@chakra-ui/react';
import {App} from './App.tsx';
import {ActivitiesProvider, AthleteProvider} from './providers';

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: true,
};

const theme = extendTheme({config});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ChakraProvider theme={theme}>
    <AthleteProvider>
      <ActivitiesProvider>
        <ColorModeScript initialColorMode={theme.config.initialColorMode} />
        <App />
      </ActivitiesProvider>
    </AthleteProvider>
  </ChakraProvider>
);
