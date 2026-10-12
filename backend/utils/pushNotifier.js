const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

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
  const tokens = (Array.isArray(pushTokens) ? pushTokens : [pushTokens])
    .filter((t) => typeof t === 'string' && t.startsWith('ExponentPushToken['));

  if (tokens.length === 0) {
    return { success: false, reason: 'No valid Expo push tokens provided' };
  }

  const messages = tokens.map((to) => ({
    to,
    sound: 'default',
    title,
    body,
    data,
    priority: 'high',
    channelId: 'default',
    badge: 1,
  }));

  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await res.json();
    console.log('Expo Push Notification response:', JSON.stringify(result));
    return { success: true, result };
  } catch (error) {
    console.error('Error sending Expo push notification:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendPushNotification,
};
