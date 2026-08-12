/**
 * @format
 */
import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import notifee, { EventType, AndroidStyle } from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';

// Handles data messages the backend sends while the app is killed/backgrounded.
// We intercept these data-only pushes to manually construct a rich notification
// using Notifee, allowing us to display the sender's avatar as a large icon.
//
// Wrapped defensively: this runs at JS-bundle-load time, before a single
// frame renders. If the native Firebase module isn't ready yet on a given
// device/cold-start timing, letting this throw here would take the whole
// app down before AppRegistry.registerComponent ever runs.
try {
  setBackgroundMessageHandler(getMessaging(), async (remoteMessage) => {
    console.log('Background FCM message:', remoteMessage.messageId);

    const rawData = remoteMessage.data ?? {};
    const title = rawData.title || rawData.senderName || 'New message';
    const body = rawData.body || '';
    const senderPhotoUrl = rawData.senderPhotoUrl || undefined;
    const groupId = rawData.chatId || 'chatly_messages';

    try {
      const displayed = await notifee.getDisplayedNotifications();
      const existingNotification = displayed.find(n => n.id === groupId);
      
      let messages = [];
      if (existingNotification?.notification.android?.style?.type === AndroidStyle.MESSAGING) {
        messages = existingNotification.notification.android.style.messages || [];
      }
      
      messages.push({
        text: body,
        timestamp: Date.now(),
        person: {
          name: title,
          icon: senderPhotoUrl,
        }
      });

      const currentBadge = await notifee.getBadgeCount();
      await notifee.setBadgeCount(currentBadge + 1);

      await notifee.displayNotification({
        id: groupId,
        title,
        body,
        data: rawData,
        android: {
          channelId: 'messages',
          pressAction: { id: 'default' },
          groupId,
          smallIcon: 'ic_notification',
          largeIcon: senderPhotoUrl,
          color: '#10b981',
          autoCancel: true,
          style: {
            type: AndroidStyle.MESSAGING,
            person: { name: 'Me' },
            messages,
          },
        },
      });
    } catch (err) {
      console.error('Error displaying background notification:', err);
    }
  });
} catch (err) {
  console.error('Failed to register background FCM handler:', err);
}

// Notifee's own background press handler — covers notifications *we*
// displayed via notifee.displayNotification() (see src/lib/notifications.ts)
// while the app was backgrounded/killed. Navigation itself happens once the
// app is foregrounded again via getInitialNotification/onNotificationOpenedApp.
notifee.onBackgroundEvent(async ({ type }) => {
  if (type === EventType.PRESS) {
    console.log('Notifee background notification press');
  }
});

AppRegistry.registerComponent(appName, () => App);
