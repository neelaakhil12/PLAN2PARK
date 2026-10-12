const fetchFn = typeof fetch === 'function' 
  ? fetch 
  : (...args) => import('node-fetch').then(({ default: f }) => f(...args));

/**
 * Sends an external device push notification via Expo Push Notification API.
 * Appears directly in the mobile device status bar / notification tray.
 *
 * @param {string|string[]} pushTokens - Recipient Expo Push Token(s)
 * @param {string} title - Notification title (e.g. "🎟️ Booking Confirmed!")
 * @param {string} body - Notification message
 * @param {object} data - Navigation metadata (e.g. { screen: 'Notifications' })
 */
async function sendPushNotification(pushTokens, title, body, data = {}) {
  const rawTokens = Array.isArray(pushTokens) ? pushTokens : [pushTokens];
  const tokens = rawTokens
    .filter((t) => typeof t === 'string' && (t.startsWith('ExponentPushToken[') || t.startsWith('ExpoPushToken[') || t.includes('[')));

  if (tokens.length === 0) {
    console.log('[pushNotifier] No valid Expo push tokens found in:', rawTokens);
    return { success: false, reason: 'No valid Expo push tokens provided' };
  }

  const messages = tokens.map((to) => ({
    to,
    sound: 'car_horn.wav',
    title,
    body,
    data,
    priority: 'high',
    channelId: 'default',
    badge: 1,
  }));

  try {
    const res = await fetchFn('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await res.json();
    console.log('[pushNotifier] Expo Push response:', JSON.stringify(result));
    return { success: true, result };
  } catch (error) {
    console.error('[pushNotifier] Error sending Expo push notification:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendPushNotification,
};
