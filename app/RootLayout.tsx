'use client';

import { useEffect, useMemo, useState, ReactNode } from 'react';
import { ClerkProvider } from '@clerk/nextjs';
import {
  CssBaseline,
  IconButton,
  ThemeProvider,
  createTheme,
} from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import type { PaletteMode } from '@mui/material';

import { palette } from '@/theme/palette';
import { typography } from '@/theme/typography';
import { shadows } from '@/theme/shadows';
import { components } from '@/theme/components';

export default function RootLayout({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<PaletteMode>('light');

  useEffect(() => {
    const storedMode = localStorage.getItem('theme-mode') as PaletteMode | null;
    if (storedMode) setMode(storedMode);
  }, []);

  const toggleTheme = () => {
    const newMode: PaletteMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    localStorage.setItem('theme-mode', newMode);
  };

  const darkPalette = {
    mode: 'dark' as PaletteMode,
    primary: { main: '#90caf9' },
    background: { default: '#121212', paper: '#1e1e1e' },
    text: { primary: '#ffffff', secondary: '#aaaaaa' },
  };

  const theme = useMemo(() => {
    const basePalette = mode === 'light' ? palette.light : darkPalette;

    return createTheme({
      palette: basePalette,
      typography,
      shadows,
      components,
    });
  }, [mode]);

  return (
    <ClerkProvider>
      <html lang="en">
        <body style={{ margin: 0, padding: 0 }}>
          <ThemeProvider theme={theme}>
            <CssBaseline />

            {/* Toggle Theme Button */}
            <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999 }}>
              <IconButton onClick={toggleTheme} color="inherit">
                <Brightness4Icon />
              </IconButton>
            </div>

            {/* Main Content Area */}
            <main
              style={{
                minHeight: '100vh',
                width: '100%',
                background:
                  mode === 'dark'
                    ? '#121212'
                    : '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {children}
            </main>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
