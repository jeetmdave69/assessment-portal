// src/theme/theme.ts
'use client';

import {
  experimental_extendTheme as extendTheme,
} from '@mui/material/styles';

import { palette } from './palette';
import { typography } from './typography';
import { components } from './components';
import { shadows } from './shadows';

export const theme = extendTheme({
  colorSchemes: {
    light: {
      palette: {
        mode: 'light',
        ...palette.light,
      },
    },
    dark: {
      palette: {
        mode: 'dark',
        primary: { main: '#90caf9' },
        background: { default: '#121212', paper: '#1e1e1e' },
        text: { primary: '#ffffff', secondary: '#aaaaaa' },
      },
    },
  },
  typography,
  components,
  shadows,
});
