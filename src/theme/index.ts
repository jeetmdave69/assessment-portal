import { createTheme } from '@mui/material/styles';

import { palette } from './palette';
import { typography } from './typography';
import { shadows } from './shadows';
import { components } from './components';

const theme = createTheme({
  palette: palette.light, // You can switch to palette.dark if needed
  typography,
  shadows,
  components,
  shape: { borderRadius: 8 },
  spacing: 4,
});

export default theme;
