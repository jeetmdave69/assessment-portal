'use client';

import React from 'react';
import AnimateLogoZoom from '../animate/AnimateLogoZoom';

export default function SplashScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-gray-900">
      <AnimateLogoZoom />
    </div>
  );
}
