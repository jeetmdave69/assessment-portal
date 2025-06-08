'use client';

import React from 'react';

export default function AnimateLogoZoom() {
  return (
    <div style={{ animation: 'zoom 1s ease-in-out infinite' }}>
      <img src="/logo.svg" alt="Logo" width={80} height={80} />
    </div>
  );
}
