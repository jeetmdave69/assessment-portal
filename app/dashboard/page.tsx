import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function DashboardRedirectPage() {
  const user = await currentUser();

  if (!user) {
    redirect('/sign-in');
  }

  const role = user.publicMetadata?.role;

  switch (role) {
    case 'student':
      redirect('/dashboard/student');
    case 'teacher':
      redirect('/dashboard/teacher');
    case 'admin':
      redirect('/dashboard/admin');
    default:
      return (
        <div className="h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-semibold">Access Denied</h1>
            <p className="text-gray-500">No valid role assigned. Please contact support.</p>
          </div>
        </div>
      );
  }
}
