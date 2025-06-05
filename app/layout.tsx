// app/layout.tsx

import { ReactNode } from 'react';
import { ClerkProvider } from '@clerk/nextjs';

import AuthProvider from '../src/auth/AuthProvider';
import ThemeProvider from '../src/theme/theme-provider';
import { SettingsProvider } from '../src/components/settings/settings-provider';

export const metadata = {
  title: 'Assessment Portal',
  description: 'Sign in to your account',
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className="bg-gray-100">
        <ClerkProvider>
          <AuthProvider>
            <SettingsProvider>
              <ThemeProvider>{children}</ThemeProvider>
            </SettingsProvider>
          </AuthProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
