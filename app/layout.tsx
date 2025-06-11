import { ThemeModeProvider } from '@/theme/ThemeModeProvider';
import { ClerkProvider } from '@clerk/nextjs';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Assessment Portal',
  description: 'Smart test management',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <ThemeModeProvider>
            {children}
          </ThemeModeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
