import notifee, { AndroidImportance, EventType, AndroidStyle, TriggerType } from '@notifee/react-native';
import { onMessage, getInitialNotification, onNotificationOpenedApp, type RemoteMessage } from '@react-native-firebase/messaging';
import { messaging } from './firebase';
import { resolveConversation } from './conversationResolver';
import { navigationRef } from '../navigation/navigationRef';

const MESSAGES_CHANNEL_ID = 'messages';
const REMINDERS_CHANNEL_ID = 'reminders';

export async function ensureNotificationChannel() {
  try {
    await notifee.createChannel({
      id: MESSAGES_CHANNEL_ID,
      name: 'Messages',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
    });
    await notifee.createChannel({
      id: REMINDERS_CHANNEL_ID,
      name: 'Follow-up reminders',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
    });
  } catch (error) {
    console.warn('Failed to create Notifee channel:', error);
  }
}

/**
 * Schedules a local, on-device reminder for a follow-up (see lib/tags.ts).
 * No server involved — mobile has no Cloud Functions backend of its own (see
 * root README's "Server architecture" section), so there's no scheduled
 * function to deliver this remotely. Trade-off: only fires on the device
 * that set it, and only if notification permission + the OS's exact-alarm
 * permission (Android 12+) are granted.
 */
export async function scheduleFollowUpReminder(id: string, remindAt: Date, sourceText: string) {
  try {
    await notifee.createTriggerNotification(
      {
        id: `followup-${id}`,
        title: 'Follow-up reminder',
        body: sourceText,
        android: {
          channelId: REMINDERS_CHANNEL_ID,
          pressAction: { id: 'default' },
          smallIcon: 'ic_notification',
          color: '#10b981',
        },
      },
      { type: TriggerType.TIMESTAMP, timestamp: remindAt.getTime(), alarmManager: true }
    );
  } catch (error) {
    console.warn('Could not schedule follow-up reminder:', error);
  }
}

type NotificationData = { chatId?: string; collectionName?: 'chats' | 'groups'; senderName?: string };

async function navigateToConversation(data: NotificationData, myUid: string | undefined) {
  if (!data.chatId || !data.collectionName || !myUid) return;
  const conversation = await resolveConversation(data.collectionName, data.chatId, myUid);
  if (!conversation) return;

  if (navigationRef.isReady()) {
    navigationRef.navigate('ChatWindow', { conversation });
  }
}

const activeNotifications: Record<string, any[]> = {};

/**
 * Wires up FCM (data delivery) + Notifee (Android notification display/press
 * handling) for foreground, background, and killed-app states. Call once
 * near the app root; the killed-app cold-start check only matters at launch.
 */
export function setupPushHandlers(getMyUid: () => string | undefined) {
  ensureNotificationChannel();
  // Badge count itself is kept in sync with real unread totals by
  // useUnreadBadge (src/hooks/useUnreadBadge.ts) — no reset here anymore,
  // since zeroing on every app open used to wipe a still-accurate count.

  // Foreground: FCM delivers data silently — we render it ourselves via
  // Notifee (system tray) using Android Messaging Style.
  const unsubscribeForeground = onMessage(messaging, async (remoteMessage: RemoteMessage) => {
    try {
      const title = remoteMessage.notification?.title ?? (typeof remoteMessage.data?.senderName === 'string' ? remoteMessage.data.senderName : 'New message');
      const rawData = (remoteMessage.data ?? {}) as Record<string, unknown>;
      const body = remoteMessage.notification?.body || (typeof rawData.body === 'string' ? rawData.body : '') || '';
      const data: Record<string, string> = {};
      Object.keys(rawData).forEach((key) => {
        data[key] = String(rawData[key] ?? '');
      });
      const senderPhotoUrl = data.senderPhotoUrl || undefined;
      const chatId = data.chatId || 'chatly_messages';

      if (!activeNotifications[chatId]) activeNotifications[chatId] = [];
      activeNotifications[chatId].push({
        text: body,
        timestamp: Date.now(),
        person: {
          name: title,
          icon: senderPhotoUrl,
        }
      });

      await notifee.displayNotification({
        id: chatId,
        title,
        body,
        data,
        android: {
          channelId: MESSAGES_CHANNEL_ID,
          pressAction: { id: 'default' },
          groupId: chatId,
          smallIcon: 'ic_notification',
          largeIcon: senderPhotoUrl,
          color: '#10b981',
          autoCancel: true,
          style: {
            type: AndroidStyle.MESSAGING,
            person: { name: 'Me' },
            messages: activeNotifications[chatId],
          },
        },
      });
    } catch (err) {
      console.warn('Error handling foreground push message:', err);
    }
  });

  // Notifee: user tapped the notification we displayed above (foreground-rendered).
  const unsubscribeNotifeeForeground = notifee.onForegroundEvent(({ type, detail }) => {
    const chatId = detail.notification?.id;
    if (chatId && (type === EventType.PRESS || type === EventType.DISMISSED)) {
      delete activeNotifications[chatId];
    }
    if (type === EventType.PRESS) navigateToConversation((detail.notification?.data ?? {}) as NotificationData, getMyUid());
  });

  // App was backgrounded (not killed) and the user tapped the system notification.
  const unsubscribeOpenedApp = onNotificationOpenedApp(messaging, (remoteMessage) => {
    navigateToConversation(remoteMessage.data as NotificationData, getMyUid());
  });

  // App was fully killed and launched by tapping a notification.
  getInitialNotification(messaging).then((remoteMessage) => {
    if (remoteMessage) navigateToConversation(remoteMessage.data as NotificationData, getMyUid());
  });

  return () => {
    unsubscribeForeground();
    unsubscribeNotifeeForeground();
    unsubscribeOpenedApp();
  };
}
