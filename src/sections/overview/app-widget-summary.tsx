// src/sections/overview/app-widget-summary.tsx

'use client';

import { Card, Stack, Typography, Box, useTheme } from '@mui/material';
import { Icon } from '@iconify/react';
import CountUp from 'react-countup';

type Props = {
  title: string;
  total: number;
  icon: string;
  color?: 'primary' | 'info' | 'success' | 'warning' | 'error';
};

export default function AppWidgetSummary({
  title,
  total,
  icon,
  color = 'primary',
}: Props) {
  const theme = useTheme();
  const iconColor = theme.palette[color].main;
const bgColor = theme.palette[color].light;

  return (
    <Card
      sx={{
        p: 3,
        boxShadow: theme.shadows[3],
        borderRadius: 2,
        bgcolor: theme.palette.background.paper,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={2}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            backgroundColor: bgColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon icon={icon} width={28} height={28} color={iconColor} />
        </Box>

        <Box>
          <Typography variant="subtitle2" color="text.secondary">
            {title}
          </Typography>
          <Typography variant="h4" fontWeight={700}>
            <CountUp end={total} duration={1} separator="," />
          </Typography>
        </Box>
      </Stack>
    </Card>
  );
}
