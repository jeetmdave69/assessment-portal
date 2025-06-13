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

import { palette } from '@/theme/palette';
import { typography } from '@/theme/typography';
import { components } from '@/theme/components';
import { shadows } from '@/theme/shadows';

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
  const [mode, setMode] = useState<ThemeMode>('light');
  const [mounted, setMounted] = useState(false); // 👈 Important

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedMode = localStorage.getItem('theme-mode') as ThemeMode;
      if (storedMode === 'light' || storedMode === 'dark') {
        setMode(storedMode);
      }
      setMounted(true); // ✅ Only render after reading localStorage
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme-mode', mode);
    }
  }, [mode]);

  const toggleMode = () => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const theme = useMemo(() => {
    const basePalette =
      mode === 'dark'
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

  // ✅ Prevent rendering until theme mode is known
  if (!mounted) return null;

  return (
    <ThemeContext.Provider value={{ mode, toggleMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}
