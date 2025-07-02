'use client';
import { useUser } from '@clerk/nextjs';

export default function AccessDenied() {
  const { isSignedIn } = useUser();

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <h1 className="text-3xl font-bold">Access Denied</h1>
      <p className="text-gray-500 dark:text-gray-400">
        {isSignedIn
          ? 'You do not have permission to view this page.'
          : 'Please sign in to access the dashboard.'}
      </p>
      {!isSignedIn && (
        <a
          href="/sign-in"
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Go to Sign In
        </a>
      )}
    </div>
  );
}
