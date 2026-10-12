import {createSystem, defaultConfig, defineConfig} from '@chakra-ui/react';

/**
 * Statva's own look: Inter for reading, Space Grotesk for headings and figures, one
 * orange accent, and warm surfaces in light and dark.
 */
const config = defineConfig({
  globalCss: {
    'html, body': {
      background: 'bg',
      color: 'fg',
      fontFamily: 'body',
    },
  },
  theme: {
    tokens: {
      fonts: {
        heading: {value: "'Space Grotesk', Inter, system-ui, sans-serif"},
        body: {value: 'Inter, system-ui, sans-serif'},
        figure: {value: "'Space Grotesk', Inter, system-ui, sans-serif"},
      },
      colors: {
        brand: {
          50: {value: '#fff5ed'},
          100: {value: '#ffe7d4'},
          200: {value: '#ffcba8'},
          300: {value: '#ffa671'},
          400: {value: '#fd7a3a'},
          500: {value: '#f25c14'},
          600: {value: '#d9450a'},
          700: {value: '#b4330c'},
          800: {value: '#8f2b12'},
          900: {value: '#742612'},
          950: {value: '#3f1006'},
        },
      },
      radii: {
        card: {value: '14px'},
      },
    },
    semanticTokens: {
      colors: {
        brand: {
          solid: {value: '{colors.brand.500}'},
          contrast: {value: 'white'},
          fg: {value: {_light: '{colors.brand.700}', _dark: '{colors.brand.300}'}},
          muted: {value: {_light: '{colors.brand.100}', _dark: '{colors.brand.900}'}},
          subtle: {value: {_light: '{colors.brand.50}', _dark: '{colors.brand.950}'}},
          emphasized: {value: {_light: '{colors.brand.200}', _dark: '{colors.brand.800}'}},
          focusRing: {value: '{colors.brand.500}'},
        },
        bg: {
          DEFAULT: {value: {_light: '#f6f5f2', _dark: '#0b0b0c'}},
          panel: {value: {_light: '#ffffff', _dark: '#141416'}},
          subtle: {value: {_light: '#efede9', _dark: '#1b1b1e'}},
          muted: {value: {_light: '#e7e4df', _dark: '#232327'}},
        },
        border: {
          DEFAULT: {value: {_light: '#e4e1db', _dark: '#26262a'}},
        },
      },
    },
  },
});

const system = createSystem(defaultConfig, config);

export {system};
