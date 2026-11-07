import React, { useState, useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import * as WebBrowser from 'expo-web-browser';

const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
  '908977180-dkg2d8h9109b4tvsnaf51scbmi4l09or.apps.googleusercontent.com';

const BRIDGE_REDIRECT_URI = 'https://plantopark.com/google-auth-bridge';

function extractTokenFromUrl(url) {
  if (!url) return null;
  try {
    const queryIdx = url.indexOf('?');
    if (queryIdx !== -1) {
      const qs = url.substring(queryIdx + 1).split('#')[0];
      const params = new URLSearchParams(qs);
      const token = params.get('id_token') || params.get('access_token');
      if (token) return token;
    }
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
    try {
      GoogleSignin.configure({
        webClientId: GOOGLE_WEB_CLIENT_ID,
        offlineAccess: false,
        scopes: ['profile', 'email'],
      });
    } catch (e) {
      console.warn('GoogleSignin configure error:', e);
    }

    const handleDeepLink = (event) => {
      if (event?.url && (event.url.includes('google-auth') || event.url.includes('id_token') || event.url.includes('access_token'))) {
        try {
          WebBrowser.dismissBrowser();
        } catch (e) {}
        const token = extractTokenFromUrl(event.url);
        if (token) {
          onAuthSuccess(token);
        }
      }
    };

    const sub = Linking.addEventListener('url', handleDeepLink);
    Linking.getInitialURL().then((initialUrl) => {
      if (initialUrl && (initialUrl.includes('google-auth') || initialUrl.includes('id_token') || initialUrl.includes('access_token'))) {
        const token = extractTokenFromUrl(initialUrl);
        if (token) {
          onAuthSuccess(token);
        }
      }
    }).catch(() => {});

    return () => {
      sub.remove();
    };
  }, [onAuthSuccess]);

  const runBrowserAuthFallback = async () => {
    try {
      setLoading(true);
      const isOwner = text.toLowerCase().includes('owner');
      const stateParam = isOwner ? 'plantopark-owner' : 'plantopark-seeker';
      const authUrl =
        `https://accounts.google.com/o/oauth2/v2/auth` +
        `?client_id=${encodeURIComponent(GOOGLE_WEB_CLIENT_ID)}` +
        `&redirect_uri=${encodeURIComponent(BRIDGE_REDIRECT_URI)}` +
        `&response_type=token%20id_token` +
        `&scope=${encodeURIComponent('openid email profile')}` +
        `&nonce=${Date.now()}` +
        `&prompt=select_account` +
        `&state=${encodeURIComponent(stateParam)}`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, `${stateParam}://`);
      if (result.type === 'success' && result.url) {
        const token = extractTokenFromUrl(result.url);
        if (token) {
          onAuthSuccess(token);
          return;
        }
      }
    } catch (browserErr) {
      console.warn('Browser Google sign-in fallback error:', browserErr);
      Alert.alert('Google Sign-In', 'Could not complete Google authentication. Please try with Email and Password.');
    } finally {
      setLoading(false);
    }
  };

  const handlePress = async () => {
    try {
      setLoading(true);
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Clear any cached session so Google ALWAYS opens the Account Chooser dialog
      try {
        await GoogleSignin.signOut();
      } catch (signOutErr) {
        // Ignore if no session active
      }

      const userInfo = await GoogleSignin.signIn();
      const token = userInfo.data?.idToken || userInfo.idToken;
      if (token) {
        onAuthSuccess(token);
      } else {
        // Fallback to browser if no token
        await runBrowserAuthFallback();
      }
    } catch (error) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled, do nothing
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // Operation already in progress
      } else {
        console.log('Google native sign-in encountered an issue, launching secure in-app browser login:', error.message || error);
        // Automatically fallback to browser authentication without blocking user with error popup
        await runBrowserAuthFallback();
      }
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
