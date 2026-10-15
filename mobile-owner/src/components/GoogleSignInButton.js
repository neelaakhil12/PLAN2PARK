import React, { useState, useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  Alert,
} from 'react-native';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';

const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
  '908977180-dkg2d8h9109b4tvsnaf51scbmi4l09or.apps.googleusercontent.com';

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
  }, []);

  const handlePress = async () => {
    try {
      setLoading(true);
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const userInfo = await GoogleSignin.signIn();
      const token = userInfo.data?.idToken || userInfo.idToken;
      if (token) {
        onAuthSuccess(token);
      } else {
        Alert.alert('Google Sign-In', 'Could not obtain Google authentication token.');
      }
    } catch (error) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled, do nothing
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // Operation already in progress
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Google Play Services', 'Google Play Services is not available or outdated on this device.');
      } else {
        console.warn('Google native sign-in error:', error);
        Alert.alert('Google Sign-In Failed', error.message || 'Failed to sign in with Google');
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
