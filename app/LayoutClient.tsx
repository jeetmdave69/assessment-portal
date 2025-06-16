'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { Inter } from 'next/font/google';
import { ThemeModeProvider } from '@/theme/ThemeModeProvider';
import { SettingsProvider } from '../components/settings/SettingsContext';
import { SettingsDrawer } from '../components/settings/SettingsDrawer';
const inter = Inter({ subsets: ['latin'] });

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <ThemeModeProvider>
            <SettingsProvider>
              <SettingsDrawer />
              {children}
            </SettingsProvider>
          </ThemeModeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
