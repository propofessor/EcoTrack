/**
 * notifications.js — RF11.2 / RF11.7
 * Registers the device for Expo push notifications and stores the token
 * on the backend so the server can send daily grade / weekly results alerts.
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import client from '../api/client';

const projectId =
  Constants?.expoConfig?.extra?.eas?.projectId ??
  Constants?.easConfig?.projectId;

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Requests notification permission and registers the push token with the backend.
 * Safe to call multiple times — silently skips on simulators or if already done.
 */
export async function registerPushNotifications() {
  if (!Device.isDevice) return; // Push notifications only work on physical devices

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const expo_push_token = tokenData.data;
    await client.put('/users/me/push-token', { expo_push_token });
  } catch (err) {
    console.warn('Push token registration failed:', err.message);
  }
}
