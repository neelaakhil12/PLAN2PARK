import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';

try {
  WebBrowser.maybeCompleteAuthSession();
} catch (e) {
  // Ignore in case environment does not support it
}

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '908977180-dkg2d8h9109b4tvsnaf51scbmi4l09or.apps.googleusercontent.com';
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '908977180-sei0dnkqlig3ljr093imk5s0n3jalu0e.apps.googleusercontent.com';

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

  let redirectUri;
  try {
    redirectUri = AuthSession.makeRedirectUri({ scheme: 'plantopark-seeker' });
  } catch (e) {
    redirectUri = 'plantopark-seeker://';
  }

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    webClientId: GOOGLE_CLIENT_ID,
    clientId: Platform.OS === 'android' ? GOOGLE_ANDROID_CLIENT_ID : GOOGLE_CLIENT_ID,
    scopes: ['openid', 'profile', 'email'],
    selectAccount: true,
    extraParams: {
      prompt: 'select_account',
    },
    redirectUri,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const token =
        response.authentication?.idToken ||
        response.authentication?.accessToken ||
        response.params?.id_token ||
        response.params?.access_token;
      if (token) {
        onAuthSuccess(token);
      }
    }
  }, [response]);

  const handlePress = async () => {
    if (!promptAsync) return;
    try {
      setLoading(true);
      await promptAsync();
    } catch (e) {
      console.warn('Google promptAsync error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.btn, (disabled || loading) && styles.disabled]}
      onPress={handlePress}
      disabled={disabled || loading || !request}
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
