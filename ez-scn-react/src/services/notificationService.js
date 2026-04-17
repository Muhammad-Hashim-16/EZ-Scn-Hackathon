// ============================================
// PennyWise — Frontend Notification Service
//
// requestNotificationPermission():
//   1. Browser Notification.requestPermission()
//   2. Gets FCM token via Firebase Messaging
//   3. Sends token to POST /api/notifications/register-token
//   4. Returns { granted: true/false }
//
// onNotificationReceived(callback):
//   Listens for foreground notifications and calls
//   the callback with { title, body }.
// ============================================

import { getFirebaseMessaging, getToken, onMessage } from '@/config/firebase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

/**
 * Request notification permission and register the FCM token with the backend.
 * @param {string} accessToken - JWT for authenticating with the backend.
 * @returns {Promise<{granted: boolean, error?: string}>}
 */
export async function requestNotificationPermission(accessToken) {
  try {
    // Step 1: Check browser support
    if (!('Notification' in window)) {
      return { granted: false, error: 'Browser does not support notifications.' };
    }

    // Step 2: Ask permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { granted: false, error: 'Permission denied by user.' };
    }

    // Step 3: Get FCM token
    const messaging = getFirebaseMessaging();
    if (!messaging) {
      // Firebase not configured — still return granted since browser permission was given
      console.warn('NotificationService — Firebase not configured, skipping FCM token.');
      return { granted: true, error: 'Firebase not configured.' };
    }

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
    });

    if (!token) {
      return { granted: true, error: 'Could not get FCM token.' };
    }

    // Step 4: Send token to backend
    await fetch(`${API_URL}/api/notifications/register-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      credentials: 'include',
      body: JSON.stringify({ token }),
    });

    return { granted: true };
  } catch (err) {
    console.error('NotificationService — requestPermission error:', err);
    return { granted: false, error: err.message };
  }
}

/**
 * Listen for foreground push notifications.
 * @param {(payload: {title: string, body: string}) => void} callback
 * @returns {Function|null} unsubscribe function, or null if not supported
 */
export function onNotificationReceived(callback) {
  const messaging = getFirebaseMessaging();
  if (!messaging) return null;

  return onMessage(messaging, (payload) => {
    const { title, body } = payload.notification || {};
    if (title && callback) {
      callback({ title, body });
    }
  });
}

/**
 * Fetch the in-app notification feed.
 * @param {string} accessToken
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export async function getNotifications(accessToken, limit = 20) {
  try {
    const res = await fetch(`${API_URL}/api/notifications?limit=${limit}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      credentials: 'include',
    });
    const data = await res.json();
    return data.success ? data.notifications : [];
  } catch {
    return [];
  }
}

/**
 * Get unread notification count (for the bell badge).
 * @param {string} accessToken
 * @returns {Promise<number>}
 */
export async function getUnreadCount(accessToken) {
  try {
    const res = await fetch(`${API_URL}/api/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      credentials: 'include',
    });
    const data = await res.json();
    return data.success ? data.unread : 0;
  } catch {
    return 0;
  }
}

/**
 * Mark a notification as read.
 * @param {string} accessToken
 * @param {string} notificationId
 */
export async function markNotificationAsRead(accessToken, notificationId) {
  try {
    await fetch(`${API_URL}/api/notifications/${notificationId}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}` },
      credentials: 'include',
    });
  } catch {
    // Silently fail
  }
}
