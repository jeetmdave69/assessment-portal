'use client';

import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        minHeight: '100vh',
        minWidth: '100vw',
        overflow: 'hidden',
        zIndex: 0,
        backgroundImage: `
          linear-gradient(120deg, rgba(34,193,195,0.22) 0%, rgba(30,41,59,0.18) 100%),
          url(https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=1500&q=80)
        `,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        filter: 'saturate(0.95) brightness(1.04)',
      }}
    >
      {/* Slightly darker vignette for focus */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.10) 60%, rgba(0,0,0,0.22) 100%)',
          zIndex: 2,
        }}
      />
      {/* Centered content with fade-in */}
      <div
        style={{
          position: 'relative',
          zIndex: 3,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          animation: 'fadeIn 1.2s cubic-bezier(.4,0,.2,1)',
        }}
      >
        {/* Logo/Icon */}
        <div style={{ marginBottom: 10 }}>
          {/* Example SVG icon: book */}
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" style={{ display: 'block' }}>
            <rect x="3" y="4" width="18" height="16" rx="2" fill="#3b82f6" opacity="0.12"/>
            <rect x="3" y="4" width="18" height="16" rx="2" stroke="#3b82f6" strokeWidth="2"/>
            <path d="M7 8h10M7 12h10M7 16h6" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        {/* Brand name */}
        <h2 style={{
          color: '#222',
          fontWeight: 800,
          marginBottom: 8,
          letterSpacing: 1,
          textShadow: '0 4px 24px rgba(0,0,0,0.18), 0 1px 0 #fff',
          fontSize: '2rem',
        }}>
          Assessment Portal
        </h2>
        {/* Tagline */}
        <div style={{
          color: '#444',
          fontWeight: 400,
          marginBottom: 18,
          fontSize: '1.05rem',
          letterSpacing: 0.2,
          textAlign: 'center',
          textShadow: '0 1px 8px rgba(255,255,255,0.18)',
        }}>
          Your gateway to smarter testing and learning.
        </div>
        {/* Divider */}
        <div style={{
          width: 60,
          height: 2,
          background: 'linear-gradient(90deg, #3b82f6 0%, #06b6d4 100%)',
          borderRadius: 2,
          marginBottom: 24,
          opacity: 0.18,
        }} />
        {/* Clerk SignIn */}
        <SignIn path="/sign-in" routing="path" />
      </div>
      {/* Fade-in animation keyframes */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(32px);}
          to { opacity: 1; transform: none;}
        }
      `}</style>
    </div>
  );
}
