import React, { useEffect, useContext } from 'react';
import { View, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, AuthContext } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import WebDesktopFrame from './src/components/WebDesktopFrame';
import * as Notifications from 'expo-notifications';
import {
  registerForPushNotificationsAsync,
  setupNotificationResponseListener,
  setupNotificationChannels,
  triggerExternalNotification,
} from './src/services/notificationService';
import { getBaseApiUrl, COMMON_HEADERS } from './src/config/api';

function AppContent() {
  const navigationRef = useNavigationContainerRef();
  const { token } = useContext(AuthContext);

  useEffect(() => {
    // 1. Initialize notification channels and request OS permissions explicitly on startup
    async function initNotifications() {
      await setupNotificationChannels();
      const { status } = await Notifications.requestPermissionsAsync();
      console.log('Seeker notification permission status:', status);
      if (token) {
        registerForPushNotificationsAsync(token);
      }
    }
    initNotifications();
  }, [token]);

  useEffect(() => {
    // 2. Real-time background sync: poll for new seeker notifications and trigger external status bar alerts
    if (!token) return;

    let seenNotifIds = new Set();
    let initialLoadDone = false;

    const pollNotifications = async () => {
      try {
        const baseUrl = await getBaseApiUrl();
        const res = await fetch(`${baseUrl}/notifications`, {
          headers: {
            ...COMMON_HEADERS,
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) return;
        const data = await res.json();
        const list = Array.isArray(data.notifications) ? data.notifications : [];

        if (!initialLoadDone) {
          const now = Date.now();
          list.forEach((n) => {
            const ageMs = now - new Date(n.createdAt || 0).getTime();
            if (!n.isRead && ageMs < 60 * 1000) {
              triggerExternalNotification({
                title: n.title || 'PlanToPark Alert',
                body: n.message || 'You have a new update regarding your parking spot.',
                data: { screen: 'Notifications', id: n._id },
              });
            }
            seenNotifIds.add(n._id);
          });
          initialLoadDone = true;
          return;
        }

        // Trigger external notification for any brand new notification
        for (const notif of list) {
          if (!seenNotifIds.has(notif._id)) {
            seenNotifIds.add(notif._id);
            if (!notif.isRead) {
              triggerExternalNotification({
                title: notif.title || 'PlanToPark Alert',
                body: notif.message || 'You have a new update regarding your parking spot.',
                data: { screen: 'Notifications', id: notif._id },
              });
            }
          }
        }
      } catch (err) {
        // Silent poll error
      }
    };

    pollNotifications();
    const interval = setInterval(pollNotifications, 5000);
    return () => clearInterval(interval);
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
    <WebDesktopFrame appName="PlanToPark Seeker App">
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
