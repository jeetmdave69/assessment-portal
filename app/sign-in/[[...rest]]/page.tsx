'use client';

import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 dark:from-gray-900 dark:via-gray-800 dark:to-black relative overflow-hidden">
      {/* Optional blurred overlay */}
      <div className="absolute inset-0 backdrop-blur-md bg-white/10 dark:bg-black/10 z-0" />

      {/* Clerk sign-in card */}
      <div className="relative z-10 w-full max-w-md p-6 sm:p-8 rounded-2xl shadow-xl bg-white/80 dark:bg-neutral-900/80 border border-white/30 dark:border-white/10 backdrop-blur-lg transition-all">
        <SignIn path="/sign-in" routing="path" />
      </div>
    </div>
  );
}
