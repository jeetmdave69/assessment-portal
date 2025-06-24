'use client';

import { Fragment } from 'react';
import Portal from '@mui/material/Portal';
import { styled } from '@mui/material/styles';
import LinearProgress from '@mui/material/LinearProgress';
import CircularProgress from '@mui/material/CircularProgress';
import Fade from '@mui/material/Fade';
import Typography from '@mui/material/Typography';

interface LoadingScreenProps {
  portal?: boolean;
  sx?: object;
  [key: string]: any;
}

export default function LoadingScreen({ portal = false, sx = {}, ...other }: LoadingScreenProps) {
  const PortalWrapper = portal ? Portal : Fragment;

  return (
    <PortalWrapper>
      <Fade in>
        <LoadingContent sx={sx} {...other}>
          <CircularProgress size={48} thickness={4} sx={{ mb: 3, color: 'primary.main' }} />
          <img
            src="/assets/illustrations/loading-bar.png"
            alt="Loading"
            style={{
              width: 120,
              height: 120,
              objectFit: 'contain',
              marginBottom: 24,
            }}
          />
          <LinearProgress color="primary" sx={{ width: '100%', maxWidth: 360, mb: 2 }} />
          <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 2 }}>
            Loading, please wait...
          </Typography>
        </LoadingContent>
      </Fade>
    </PortalWrapper>
  );
}

// Styled container
const LoadingContent = styled('div')(({ theme }) => ({
  flexGrow: 1,
  width: '100%',
  display: 'flex',
  minHeight: '100vh',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'column',
  background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
  paddingLeft: theme?.spacing?.(5) ?? 40,
  paddingRight: theme?.spacing?.(5) ?? 40,
}));
