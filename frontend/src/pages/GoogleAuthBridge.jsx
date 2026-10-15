import React, { useEffect, useState } from 'react';

export default function GoogleAuthBridge() {
  const [status, setStatus] = useState('Completing Google authentication...');
  const [targetUrl, setTargetUrl] = useState('');

  useEffect(() => {
    try {
      // 1. Parse hash fragment (standard OAuth2 implicit grant)
      const rawHash = window.location.hash.startsWith('#')
        ? window.location.hash.substring(1)
        : window.location.hash;
      const hashParams = new URLSearchParams(rawHash);

      // 2. Parse search query parameters (fallback)
      const searchParams = new URLSearchParams(window.location.search);

      // Extract tokens and state
      const idToken = hashParams.get('id_token') || searchParams.get('id_token') || '';
      const accessToken = hashParams.get('access_token') || searchParams.get('access_token') || '';
      const state = hashParams.get('state') || searchParams.get('state') || '';

      // Determine destination scheme based on state parameter
      let scheme = 'plantopark-seeker';
      if (state.toLowerCase().includes('owner')) {
        scheme = 'plantopark-owner';
      }

      // Construct native deep link back into the app
      const params = new URLSearchParams();
      if (idToken) params.set('id_token', idToken);
      if (accessToken) params.set('access_token', accessToken);
      if (state) params.set('state', state);

      const appDeepLink = `${scheme}://google-auth?${params.toString()}`;
      setTargetUrl(appDeepLink);

      setStatus('Redirecting back to PlanToPark app...');

      // Immediately redirect to native deep link
      window.location.replace(appDeepLink);

      // Fallback timer
      setTimeout(() => {
        window.location.href = appDeepLink;
      }, 500);
    } catch (err) {
      console.error('Error bridging Google auth:', err);
      setStatus('Authentication received. Please return to the PlanToPark app.');
    }
  }, []);

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0f172a',
      color: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '24px',
      textAlign: 'center',
    }}>
      <div style={{
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '16px',
        padding: '32px 24px',
        maxWidth: '420px',
        width: '100%',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          fontSize: '28px',
        }}>
          🅿️
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>
          PlanToPark
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>
          {status}
        </p>
        {targetUrl && (
          <a
            href={targetUrl}
            style={{
              display: 'inline-block',
              backgroundColor: '#10b981',
              color: '#ffffff',
              fontWeight: '600',
              fontSize: '14px',
              padding: '12px 24px',
              borderRadius: '10px',
              textDecoration: 'none',
              boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)',
            }}
          >
            Tap here if not redirected
          </a>
        )}
      </div>
    </div>
  );
}
