import React, { useEffect, useRef, useState } from 'react';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '908977180-dkg2d8h9109b4tvsnaf51scbmi4l09or.apps.googleusercontent.com';

const GoogleAuthButton = ({ onCredentialSuccess, text = 'signin_with', disabled = false }) => {
  const buttonRef = useRef(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    // Check if Google script is already loaded
    if (window.google?.accounts?.id) {
      setScriptLoaded(true);
      return;
    }

    // Otherwise check periodically or listen
    const interval = setInterval(() => {
      if (window.google?.accounts?.id) {
        setScriptLoaded(true);
        clearInterval(interval);
      }
    }, 200);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!scriptLoaded || !buttonRef.current || !window.google?.accounts?.id) return;

    try {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => {
          if (response?.credential) {
            onCredentialSuccess(response.credential);
          }
        },
      });

      // Render the standard Google sign-in button
      window.google.accounts.id.renderButton(buttonRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: text, // 'signin_with' | 'signup_with' | 'continue_with'
        shape: 'pill',
        logo_alignment: 'left',
        width: buttonRef.current.offsetWidth || 340,
      });
    } catch (err) {
      console.error('Error rendering Google button:', err);
    }
  }, [scriptLoaded, text, onCredentialSuccess]);

  return (
    <div className="w-full flex flex-col items-center justify-center my-3">
      <div 
        ref={buttonRef} 
        className={`w-full flex justify-center min-h-[44px] ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      />
    </div>
  );
};

export default GoogleAuthButton;
