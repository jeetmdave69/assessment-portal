'use client';

import {
  experimental_extendTheme as extendTheme,
} from '@mui/material/styles';

import { palette } from './palette';
import { typography } from './typography';
import { components } from './components';
import { shadows } from './shadows';

// Shared theme options
const baseOptions = {
  typography,
  components,
  shadows,
};

// Define light and dark themes separately
export const lightTheme = extendTheme({
  ...baseOptions,
  colorSchemes: {
    light: {
      palette: {
        mode: 'light',
        ...palette.light,
      },
    },
  },
});

export const darkTheme = extendTheme({
  ...baseOptions,
  colorSchemes: {
    dark: {
      palette: {
        mode: 'dark',
        primary: { main: '#90caf9' },
        background: { default: '#121212', paper: '#1e1e1e' },
        text: { primary: '#ffffff', secondary: '#aaaaaa' },
      },
    },
  },
});

// Optionally export a default combined theme
export const theme = lightTheme;
