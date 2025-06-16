'use client';

import { createContext, useContext, useState } from 'react';

const defaultSettings = {
  colorScheme: 'light',
};

const SettingsContext = createContext({
  settings: defaultSettings,
  setSettings: (_: any) => {},
  toggleDrawer: () => {},
  isDrawerOpen: false,
});

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = useState(defaultSettings);
  const [isDrawerOpen, setDrawerOpen] = useState(false);

  const toggleDrawer = () => setDrawerOpen(!isDrawerOpen);

  return (
    <SettingsContext.Provider value={{ settings, setSettings, toggleDrawer, isDrawerOpen }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
