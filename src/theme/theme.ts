// src/theme/theme.ts

'use client';

import { createTheme } from '@mui/material/styles';
import { palette as lightPalette } from './palette';
import { typography } from './typography';
import { components } from './components';

const getTheme = (mode: 'light' | 'dark') => {
  const isDark = mode === 'dark';

  return createTheme({
    palette: isDark
      ? {
          mode: 'dark',
          primary: { main: '#90caf9' },
          background: { default: '#121212', paper: '#1e1e1e' },
          text: { primary: '#ffffff', secondary: '#aaaaaa' },
        }
      : {
          mode: 'light',
          ...lightPalette,
        },
    typography,
    components,
  });
};

export default getTheme;
