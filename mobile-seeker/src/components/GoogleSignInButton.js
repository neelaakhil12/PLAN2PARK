import React, { useState, useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  Linking,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';

try {
  WebBrowser.maybeCompleteAuthSession();
} catch (e) {
  // Ignore in case environment does not support it
}

const GOOGLE_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
  '908977180-dkg2d8h9109b4tvsnaf51scbmi4l09or.apps.googleusercontent.com';
const BRIDGE_REDIRECT_URI = 'https://plantopark.com/google-auth-bridge';
const APP_SCHEME = 'plantopark-seeker';

function extractTokenFromUrl(url) {
  if (!url) return null;
  try {
    // 1. Search params (?id_token=... or ?access_token=...)
    const queryIdx = url.indexOf('?');
    if (queryIdx !== -1) {
      const qs = url.substring(queryIdx + 1).split('#')[0];
      const params = new URLSearchParams(qs);
      const token = params.get('id_token') || params.get('access_token');
      if (token) return token;
    }

    // 2. Hash params (#id_token=... or #access_token=...)
    const hashIdx = url.indexOf('#');
    if (hashIdx !== -1) {
      const hs = url.substring(hashIdx + 1);
      const params = new URLSearchParams(hs);
      const token = params.get('id_token') || params.get('access_token');
      if (token) return token;
    }
  } catch (e) {
    console.warn('Error extracting token from URL:', e);
  }
  return null;
}

class GoogleErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error) {
    console.warn('Google Sign-In button failed to load:', error);
  }
  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

function GoogleSignInButtonInner({ onAuthSuccess, text = 'Sign in with Google', disabled = false }) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleDeepLink = (event) => {
      if (event?.url && event.url.startsWith(`${APP_SCHEME}://`)) {
        try {
          WebBrowser.dismissBrowser();
        } catch (e) {}
        const token = extractTokenFromUrl(event.url);
        if (token) {
          onAuthSuccess(token);
        }
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check if app was opened via cold-start deep link
    Linking.getInitialURL().then((initialUrl) => {
      if (initialUrl && initialUrl.startsWith(`${APP_SCHEME}://`)) {
        const token = extractTokenFromUrl(initialUrl);
        if (token) {
          onAuthSuccess(token);
        }
      }
    }).catch(() => {});

    return () => {
      subscription.remove();
    };
  }, [onAuthSuccess]);

  const handlePress = async () => {
    try {
      setLoading(true);

      const authUrl =
        `https://accounts.google.com/o/oauth2/v2/auth` +
        `?client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
        `&redirect_uri=${encodeURIComponent(BRIDGE_REDIRECT_URI)}` +
        `&response_type=token%20id_token` +
        `&scope=${encodeURIComponent('openid email profile')}` +
        `&nonce=${Date.now()}` +
        `&prompt=select_account` +
        `&state=${encodeURIComponent(APP_SCHEME)}`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, `${APP_SCHEME}://`);

      if (result.type === 'success' && result.url) {
        const token = extractTokenFromUrl(result.url);
        if (token) {
          onAuthSuccess(token);
        }
      }
    } catch (e) {
      console.warn('Google auth bridge error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.btn, (disabled || loading) && styles.disabled]}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color="#1e293b" />
        ) : (
          <>
            <View style={styles.iconCircle}>
              <Text style={styles.googleLetter}>G</Text>
            </View>
            <Text style={styles.txt}>{text}</Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function GoogleSignInButton(props) {
  return (
    <GoogleErrorBoundary>
      <GoogleSignInButtonInner {...props} />
    </GoogleErrorBoundary>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  disabled: {
    opacity: 0.6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  googleLetter: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 13,
    lineHeight: 15,
  },
  txt: {
    color: '#1e293b',
    fontSize: 14,
    fontWeight: '700',
  },
});
