import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { db } from '../firebaseConfig';
import { User } from 'firebase/auth';
import { logError } from '../lib/error-logger';

const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND_NOTIFICATION_TASK';

TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error }) => {
  if (error) {
    logError("Background task error", error, { data }, "medium", "client-app");
    return;
  }
  if (data) {
    console.log("Notification received in background:", data);
  }
});

// Configure Notification Handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });

    // Custom Slyzah Alert Channel
    await Notifications.setNotificationChannelAsync('slyzah_alert', {
      name: 'Slyzah Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FFD700',
      sound: 'notification-sound.mp3',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return undefined;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;

    try {
      return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    } catch (e) {
      logError("Error fetching push token", e, { projectId }, "low", "client-app");
    }
  }
  return undefined;
}

/**
 * Modular Hook for Push Notifications in Slyzah Client App
 */
export function usePushNotifications(user: User | null, router: any) {
  // 1. Register background task on mount
  useEffect(() => {
    Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK).catch(err => console.log("Task Register Error:", err));
  }, []);

  // 2. Fetch and sync token when user logs in
  useEffect(() => {
    if (user) {
      registerForPushNotificationsAsync().then(async (token) => {
        if (token) {
          const userRef = doc(db, "users", user.uid);
          try {
            const userSnap = await getDoc(userRef);
            // Check if token changed before writing to save costs
            if (!userSnap.exists() || userSnap.data()?.expoPushToken !== token) {
              console.log("Updating Push Token:", token);
              await setDoc(userRef, { expoPushToken: token, lastTokenUpdate: new Date() }, { merge: true });
            } else {
              console.log("Push token is up to date.");
            }
          } catch (err) {
            console.log("Error syncing push token:", err);
          }
        }
      });
    }
  }, [user]);

  // 3. Handle Notification Tap
  const lastNotificationResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (
      lastNotificationResponse &&
      lastNotificationResponse.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER
    ) {
      const data = lastNotificationResponse.notification.request.content.data;
      if (data?.chatId) {
        try {
          router.push(`/chat/${data.chatId}`);
        } catch {
          router.push(`/${data.chatId}`);
        }
      } else if (data?.leadId) {
        router.push('/dashboard');
      }
    }
  }, [lastNotificationResponse, router]);
}
