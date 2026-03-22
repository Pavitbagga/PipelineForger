import { supabase } from '../lib/supabase';

export const LoginPage = () => {
  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      console.error('[auth] Google sign-in failed:', error.message);
    }
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: '#0a0a0f',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'JetBrains Mono, monospace',
      }}
    >
      {/* Card */}
      <div
        style={{
          background: '#13131a',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: '48px 40px',
          width: '100%',
          maxWidth: '400px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        }}
      >
        {/* Logo */}
        <div
          style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: '32px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '4px',
          }}
        >
          <span style={{ color: '#6366f1' }}>⚡</span>
          <span style={{ color: '#ffffff' }}>Forge</span>
        </div>

        {/* Subtitle */}
        <p
          style={{
            fontSize: '14px',
            color: 'rgba(255,255,255,0.45)',
            textAlign: 'center',
            margin: '0 0 32px',
            lineHeight: 1.6,
          }}
        >
          Build AI pipelines in plain English
        </p>

        {/* Google button */}
        <button
          onClick={handleGoogleSignIn}
          style={{
            width: '100%',
            height: '48px',
            background: '#4285f4',
            border: 'none',
            borderRadius: '10px',
            color: '#ffffff',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            fontFamily: 'JetBrains Mono, monospace',
            transition: 'filter 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.filter = 'brightness(1.12)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.filter = 'none';
          }}
        >
          {/* Google 'G' SVG */}
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path
              d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
              fill="#fff"
            />
            <path
              d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
              fill="#fff"
            />
            <path
              d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
              fill="#fff"
            />
            <path
              d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z"
              fill="#fff"
            />
          </svg>
          Continue with Google
        </button>

        {/* Footer note */}
        <p
          style={{
            fontSize: '12px',
            color: 'rgba(255,255,255,0.25)',
            textAlign: 'center',
            marginTop: '20px',
            lineHeight: 1.6,
          }}
        >
          No account needed — sign in with Google to get started
        </p>
      </div>
    </div>
  );
};
