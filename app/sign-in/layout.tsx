'use client';

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f3f4f6', // Tailwind bg-gray-100
        padding: '1rem',
      }}
    >
      <div style={{ maxWidth: 400, width: '100%' }}>{children}</div>
    </div>
  );
}
