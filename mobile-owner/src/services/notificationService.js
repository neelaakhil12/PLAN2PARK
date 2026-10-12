import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { getBaseApiUrl, COMMON_HEADERS } from '../config/api';

// Configure foreground notification behavior (alert, banner, list, sound, badge)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

/**
 * Configure Android Notification Channels for High-Priority external delivery
 */
export async function setupNotificationChannels() {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('plantopark_alerts_v2', {
        name: 'PlanToPark Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3b82f6',
        sound: 'car_horn.wav',
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
      });
    } catch (e) {
      console.warn('Primary channel creation notice:', e?.message);
    }

    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'PlanToPark Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3b82f6',
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    } catch (e) {
      console.warn('Default channel creation notice:', e?.message);
    }
  }
}

/**
 * Request notification permissions and register Expo Push Token with backend
 */
export async function registerForPushNotificationsAsync(authToken) {
  try {
    await setupNotificationChannels();

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission not granted');
      return null;
    }

    // Fetch Expo Push Token with EAS Project ID
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId ??
      'da5dc672-9247-4deb-81b3-d4f967285991';

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    }).catch((err) => {
      console.log('Failed to fetch Expo push token (may be Expo Go / Simulator):', err.message);
      return null;
    });

    const pushToken = tokenData?.data;
    if (pushToken && authToken) {
      try {
        const baseUrl = await getBaseApiUrl();
        await fetch(`${baseUrl}/auth/push-token`, {
          method: 'POST',
          headers: {
            ...COMMON_HEADERS,
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ pushToken }),
        });
        console.log('Registered push token with backend:', pushToken);
      } catch (syncErr) {
        console.warn('Failed to register push token with backend:', syncErr.message);
      }
    }

    return pushToken;
  } catch (e) {
    console.warn('Push notification setup error:', e.message);
    return null;
  }
}

/**
 * Trigger an immediate external notification into the phone's status bar
 * Appears in the top notification tray with sound, vibration, and badge
 *
 * @param {object} param
 * @param {string} param.title - E.g. "🎟️ Booking Confirmed!"
 * @param {string} param.body - E.g. "Slot Slot-1 reserved at Ramya parking spot"
 * @param {object} param.data - Data payload, e.g. { screen: 'Notifications' }
 */
export async function triggerExternalNotification({ title, body, data = {} }) {
  try {
    await setupNotificationChannels();
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      await Notifications.requestPermissionsAsync();
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'car_horn.wav',
        channelId: 'plantopark_alerts_v2',
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: null,
    });
  } catch (err) {
    console.warn('Primary external notification failed, retrying on fallback channel:', err?.message);
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          channelId: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: null,
      });
    } catch (fallbackErr) {
      console.warn('Fallback external notification failed:', fallbackErr?.message);
    }
  }
}

/**
 * Set up click/tap listeners on external notifications
 * When user taps the status bar notification banner, navigates to target tab/screen
 *
 * @param {object} navigationRef - React Navigation ref
 */
export function setupNotificationResponseListener(navigationRef) {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    try {
      const data = response?.notification?.request?.content?.data || {};
      const targetScreen = data.screen || 'Notifications';

      if (navigationRef?.isReady && navigationRef.isReady()) {
        navigationRef.navigate(targetScreen, data.params || {});
      } else if (navigationRef?.navigate) {
        navigationRef.navigate(targetScreen, data.params || {});
      }
    } catch (navErr) {
      console.warn('Error redirecting on notification click:', navErr);
    }
  });

  return subscription;
}
