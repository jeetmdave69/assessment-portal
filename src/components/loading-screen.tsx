'use client';

import { Fragment } from 'react';
import Portal from '@mui/material/Portal';
import { styled } from '@mui/material/styles';
import LinearProgress from '@mui/material/LinearProgress';

interface LoadingScreenProps {
  portal?: boolean;
  sx?: object;
  [key: string]: any;
}

export default function LoadingScreen({ portal = false, sx = {}, ...other }: LoadingScreenProps) {
  const PortalWrapper = portal ? Portal : Fragment;

  return (
    <PortalWrapper>
      <LoadingContent sx={sx} {...other}>
        {/* ✅ Your loading image */}
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

        {/* Optional Linear Progress bar */}
        <LinearProgress color="inherit" sx={{ width: '100%', maxWidth: 360 }} />
      </LoadingContent>
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
  paddingLeft: theme?.spacing?.(5) ?? 40,
  paddingRight: theme?.spacing?.(5) ?? 40,
}));
