import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api(.*)',
]);

export default clerkMiddleware((auth, req) => {
  if (isPublicRoute(req)) return;
  auth();
});

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'], // do not match static files
};
