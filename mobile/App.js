import React, { useEffect, useContext } from 'react';
import { View, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, AuthContext } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import WebDesktopFrame from './src/components/WebDesktopFrame';
import { registerForPushNotificationsAsync, setupNotificationResponseListener } from './src/services/notificationService';

function AppContent() {
  const navigationRef = useNavigationContainerRef();
  const { token } = useContext(AuthContext);

  useEffect(() => {
    // Register push notification token with backend when logged in
    if (token) {
      registerForPushNotificationsAsync(token);
    }
  }, [token]);

  useEffect(() => {
    // Listen for external notification taps from status bar and redirect
    const sub = setupNotificationResponseListener(navigationRef);
    return () => {
      if (sub && sub.remove) sub.remove();
    };
  }, [navigationRef]);

  const content = (
    <NavigationContainer ref={navigationRef}>
      <StatusBar style="light" backgroundColor="#0f172a" translucent={false} />
      <AppNavigator />
    </NavigationContainer>
  );

  return Platform.OS === 'web' ? (
    <WebDesktopFrame appName="Plan2Park Seeker App">
      {content}
    </WebDesktopFrame>
  ) : (
    <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
      {content}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: '#0f172a' }}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
