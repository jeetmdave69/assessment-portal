// src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',     // ✅ allow access to Clerk auth route
  '/sign-up(.*)',
  '/api(.*)',
]);

export default clerkMiddleware((auth, req) => {
  if (isPublicRoute(req)) return;
  auth(); // All other routes require auth
});

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
};
