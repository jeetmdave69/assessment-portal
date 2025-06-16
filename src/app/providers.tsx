'use client'

import { ThemeModeProvider } from '@/providers/ThemeModeProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  return <ThemeModeProvider>{children}</ThemeModeProvider>
}
