// src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/attempt-quiz(.*)',
  '/result(.*)',
  '/create-quiz(.*)',
  '/edit-quiz(.*)',
  '/preview-quiz(.*)',
]);

const studentOnlyRoutes = createRouteMatcher([
  '/dashboard/student(.*)',
  '/attempt-quiz(.*)',
  '/result(.*)',
]);

const teacherOnlyRoutes = createRouteMatcher([
  '/dashboard/teacher(.*)',
  '/dashboard/admin(.*)',
  '/create-quiz(.*)',
  '/edit-quiz(.*)',
  '/preview-quiz(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  // Only protect certain routes
  if (!isProtectedRoute(req)) return NextResponse.next();

  const { userId, sessionClaims, redirectToSignIn } = await auth();
  if (!userId) {
    return redirectToSignIn();
  }

  const role = (sessionClaims as any)?.publicMetadata?.role;

  // Student cannot access teacher/admin pages
  if (role === 'student' && teacherOnlyRoutes(req)) {
    return NextResponse.redirect(new URL('/unauthorized/access-denied', req.url));
  }

  // Teacher cannot access student pages
  if (role === 'teacher' && studentOnlyRoutes(req)) {
    return NextResponse.redirect(new URL('/unauthorized/access-denied', req.url));
  }

  // Admin can access everything
  // If you want to restrict admin, add logic here

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
};
