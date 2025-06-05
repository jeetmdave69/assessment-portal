// src/theme/index.ts
import { createTheme } from '@mui/material/styles'
import palette from './palette'
import typography from './typography'

const theme = createTheme({
  palette,
  typography,
  shape: { borderRadius: 8 },
  spacing: 4,
})

export default theme
