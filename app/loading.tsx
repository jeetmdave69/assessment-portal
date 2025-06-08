'use client'; // ✅ Mark as a client component

import dynamic from 'next/dynamic';

// ✅ Dynamically import the client component
const LoadingScreen = dynamic(() => import('@components/loading-screen'), {
  ssr: false,
});

export default function Loading() {
  return <LoadingScreen />;
}
