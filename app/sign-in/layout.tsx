'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { Box, CssBaseline } from '@mui/material';
import { ThemeModeProvider } from '@/theme/theme-provider';

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <ThemeModeProvider>
        <CssBaseline />

        {/* Blurred gradient background */}
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, #4e54c8, #8f94fb)',
            filter: 'blur(160px)',
            opacity: 0.3,
            zIndex: -1,
            transition: 'opacity 0.5s ease',
          }}
        />

        {/* Centered sign-in container */}
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.default',
            px: 2,
          }}
        >
          {children}
        </Box>
      </ThemeModeProvider>
    </ClerkProvider>
  );
}
