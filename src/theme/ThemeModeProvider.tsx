'use client';

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  PaletteMode,
} from '@mui/material';

import { palette } from './palette';
import { typography } from './typography';
import { components } from './components';
import { shadows } from './shadows';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useThemeMode = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeMode must be used within ThemeModeProvider');
  }
  return context;
};

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('dark');

  // Load mode from localStorage on mount
  useEffect(() => {
    const storedMode = localStorage.getItem('theme-mode') as ThemeMode;
    if (storedMode === 'light' || storedMode === 'dark') {
      setMode(storedMode);
    }
  }, []);

  // Save mode to localStorage on change
  useEffect(() => {
    localStorage.setItem('theme-mode', mode);
  }, [mode]);

  const toggleMode = () => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const theme = useMemo(() => {
    const isDark = mode === 'dark';

    const basePalette = isDark
      ? {
          mode: 'dark' as PaletteMode,
          primary: { main: '#90caf9' },
          background: {
            default: '#121212',
            paper: '#1e1e1e',
          },
          text: {
            primary: '#ffffff',
            secondary: '#aaaaaa',
          },
        }
      : {
          mode: 'light' as PaletteMode,
          ...palette.light,
        };

    return createTheme({
      palette: basePalette,
      typography,
      components,
      shadows,
    });
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ mode, toggleMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}
