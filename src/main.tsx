import ReactDOM from 'react-dom/client';
import {ChakraProvider, ThemeConfig, extendTheme} from '@chakra-ui/react';
import {App} from './App.tsx';
import {ActivitiesProvider} from './providers';
import './index.css';

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

const theme = extendTheme({config});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ChakraProvider theme={theme}>
    <ActivitiesProvider>
      <App />
    </ActivitiesProvider>
  </ChakraProvider>
);
