'use client';

import {
  Drawer,
  IconButton,
  Typography,
  Switch,
  Box,
  Divider,
  Tooltip,
} from '@mui/material';
import { Brightness4, Brightness7, Close, Settings } from '@mui/icons-material';
import { useSettings } from './SettingsContext';
import { useColorScheme } from '@mui/material/styles';

export const SettingsDrawer = () => {
  const { settings, setSettings, toggleDrawer, isDrawerOpen } = useSettings();
  const { mode, setMode } = useColorScheme();

  const handleToggleDarkMode = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    setSettings({ ...settings, colorScheme: newMode });
  };

  return (
    <>
      {/* Floating Gear Button */}
      <Box sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1300 }}>
        <Tooltip title="Settings">
          <IconButton onClick={toggleDrawer} color="primary">
            <Settings />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Drawer UI */}
      <Drawer anchor="right" open={isDrawerOpen} onClose={toggleDrawer}>
        <Box sx={{ width: 300, p: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Settings</Typography>
            <IconButton onClick={toggleDrawer}>
              <Close />
            </IconButton>
          </Box>
          <Divider sx={{ my: 2 }} />

          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography>Dark Mode</Typography>
            <Switch checked={mode === 'dark'} onChange={handleToggleDarkMode} />
          </Box>
        </Box>
      </Drawer>
    </>
  );
};
