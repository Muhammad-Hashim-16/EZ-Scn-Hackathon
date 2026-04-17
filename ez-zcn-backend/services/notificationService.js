// ============================================
// PennyWise — Notification Service
//
// Handles push notifications via Firebase Cloud
// Messaging, price-change alerts, weekly prompts,
// and re-engagement messages.
// ============================================

const db = require('../config/db');
const { getFirebaseAdmin } = require('../config/firebase');

// ══════════════════════════════════════════════
// 1. sendPushNotification(userId, title, body, actionUrl)
// ══════════════════════════════════════════════
async function sendPushNotification(userId, title, body, actionUrl = '/dashboard') {
  // 1a. Get user's FCM token
  const userResult = await db.query(
    `SELECT fcm_token, notification_enabled, full_name
     FROM users WHERE id = $1`,
    [userId]
  );

  if (userResult.rows.length === 0) {
    console.warn(`Notification Service — User ${userId} not found`);
    return { sent: false, reason: 'user_not_found' };
  }

  const user = userResult.rows[0];

  // Respect user preference
  if (!user.notification_enabled) {
    return { sent: false, reason: 'notifications_disabled' };
  }

  // No FCM token = user never granted browser permission
  if (!user.fcm_token) {
    // Still log the notification so it shows in-app
    await logNotification(userId, title, body, 'no_token');
    return { sent: false, reason: 'no_fcm_token' };
  }

  // 1b. Send via Firebase
  const admin = getFirebaseAdmin();
  if (!admin) {
    await logNotification(userId, title, body, 'firebase_unavailable');
    return { sent: false, reason: 'firebase_not_configured' };
  }

  try {
    await admin.messaging().send({
      token: user.fcm_token,
      notification: { title, body },
      webpush: {
        fcmOptions: { link: actionUrl },
        notification: {
          icon: '/icon-192.png',
          badge: '/badge-72.png',
          vibrate: [100, 50, 100],
        },
      },
    });

    await logNotification(userId, title, body, 'sent');
    return { sent: true };
  } catch (err) {
    console.warn(`Notification Service — FCM send failed for ${userId}:`, err.message);

    // If token is invalid/expired, clear it
    if (
      err.code === 'messaging/registration-token-not-registered' ||
      err.code === 'messaging/invalid-registration-token'
    ) {
      await db.query('UPDATE users SET fcm_token = NULL WHERE id = $1', [userId]);
    }

    await logNotification(userId, title, body, 'failed');
    return { sent: false, reason: err.message };
  }
}

// ── Log every notification to notifications_log ──
async function logNotification(userId, title, body, status) {
  try {
    // Determine notification type from title keywords
    let notificationType = 'general';
    if (/petrol|oil|chicken|atta|price/i.test(title)) notificationType = 'inflation';
    else if (/weekly|check-in/i.test(title)) notificationType = 'weekly_prompt';
    else if (/miss|back|return/i.test(title)) notificationType = 'reengagement';

    await db.query(
      `INSERT INTO notifications_log
         (user_id, notification_type, title, body, sent_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [userId, notificationType, title, body]
    );
  } catch (err) {
    console.error('Notification Service — Log failed:', err.message);
  }
}

// ══════════════════════════════════════════════
// 2. checkPriceChangesAndNotify()
// ══════════════════════════════════════════════
async function checkPriceChangesAndNotify() {
  console.log('🔔 Notification Service — Checking price changes...');

  try {
    // Get current prices
    const currentResult = await db.query(
      `SELECT DISTINCT ON (data_type)
         data_type, value, fetched_at
       FROM inflation_cache
       ORDER BY data_type, fetched_at DESC`
    );

    // Get prices from ~24 hours ago
    const oldResult = await db.query(
      `SELECT DISTINCT ON (data_type)
         data_type, value, fetched_at
       FROM inflation_cache
       WHERE fetched_at <= NOW() - INTERVAL '20 hours'
       ORDER BY data_type, fetched_at DESC`
    );

    const current = {};
    for (const row of currentResult.rows) {
      current[row.data_type] = parseFloat(row.value);
    }

    const old = {};
    for (const row of oldResult.rows) {
      old[row.data_type] = parseFloat(row.value);
    }

    // Get users with notifications enabled
    const usersResult = await db.query(
      `SELECT id FROM users WHERE notification_enabled = TRUE`
    );
    const userIds = usersResult.rows.map((u) => u.id);

    if (userIds.length === 0) {
      console.log('   No users with notifications enabled');
      return;
    }

    // ── Petrol: any change ──
    if (current.petrol_price && old.petrol_price && current.petrol_price !== old.petrol_price) {
      const diff = current.petrol_price - old.petrol_price;
      const pct = ((diff / old.petrol_price) * 100).toFixed(1);
      const direction = diff > 0 ? 'Up' : 'Down';

      for (const uid of userIds) {
        // Estimate impact: avg 50L/month fuel usage
        const estimatedImpact = Math.abs(diff * 50);

        await sendPushNotification(
          uid,
          '⛽ Petrol Price Update',
          `Petrol is now PKR ${current.petrol_price}/liter (was PKR ${old.petrol_price}). ` +
          `${direction} ${Math.abs(pct)}%. Your monthly fuel cost changes by ~PKR ${estimatedImpact.toFixed(0)}.`,
          '/dashboard'
        );
      }
      console.log(`   ⛽ Petrol: ${old.petrol_price} → ${current.petrol_price} (${direction} ${pct}%)`);
    }

    // ── Cooking oil: >= 5% change ──
    if (current.cooking_oil && old.cooking_oil) {
      const diff = current.cooking_oil - old.cooking_oil;
      const pct = ((diff / old.cooking_oil) * 100).toFixed(1);

      if (Math.abs(pct) >= 5) {
        const direction = diff > 0 ? 'up' : 'down';
        for (const uid of userIds) {
          await sendPushNotification(
            uid,
            '🫙 Cooking Oil Price Alert',
            `Cooking oil is now PKR ${current.cooking_oil}/liter — ${direction} ${Math.abs(pct)}% this week.`,
            '/dashboard'
          );
        }
        console.log(`   🫙 Cooking Oil: ${old.cooking_oil} → ${current.cooking_oil} (${pct}%)`);
      }
    }

    // ── Chicken price convergence ──
    if (current.chicken_broiler && current.chicken_desi) {
      const ratio = current.chicken_broiler / current.chicken_desi;
      // If broiler is within 10% of desi (unusual — desi is usually much higher)
      if (ratio >= 0.9 && ratio <= 1.1) {
        for (const uid of userIds) {
          await sendPushNotification(
            uid,
            '🐔 Chicken Price Insight',
            `Broiler chicken (PKR ${current.chicken_broiler}/kg) is now close to ` +
            `Desi price (PKR ${current.chicken_desi}/kg). Consider your preference.`,
            '/dashboard'
          );
        }
        console.log(`   🐔 Chicken convergence: Broiler ${current.chicken_broiler} ≈ Desi ${current.chicken_desi}`);
      }
    }

    console.log('🔔 Notification Service — Price check complete');
  } catch (err) {
    console.error('Notification Service — checkPriceChanges error:', err.message);
  }
}

// ══════════════════════════════════════════════
// 3. sendWeeklyTrackerPrompt()
// ══════════════════════════════════════════════
async function sendWeeklyTrackerPrompt() {
  console.log('🔔 Notification Service — Sending weekly prompts...');

  try {
    const usersResult = await db.query(
      `SELECT id FROM users
       WHERE weekly_tracker_opt_in = TRUE
         AND notification_enabled = TRUE`
    );

    let sent = 0;
    for (const user of usersResult.rows) {
      await sendPushNotification(
        user.id,
        '📝 Weekly Check-In Time!',
        'How much did you spend this week? Log it in 2 minutes.',
        '/weekly'
      );
      sent++;
    }

    console.log(`🔔 Weekly prompts sent to ${sent} users`);
  } catch (err) {
    console.error('Notification Service — weeklyPrompt error:', err.message);
  }
}

// ══════════════════════════════════════════════
// 4. sendReengagementNotification(userId)
// ══════════════════════════════════════════════

const REENGAGEMENT_MESSAGES = [
  {
    title: '💰 Your PennyWise Misses You!',
    body: 'Prices have changed while you were away. Check what it means for your budget.',
  },
  {
    title: '📊 Weekly Savings Update Ready',
    body: "Haven't logged expenses lately? A quick update keeps your insights accurate.",
  },
  {
    title: '🎯 How Are Your Goals Doing?',
    body: 'Come back and see your progress — small steps add up!',
  },
];

async function sendReengagementNotification(userId) {
  const msg = REENGAGEMENT_MESSAGES[Math.floor(Math.random() * REENGAGEMENT_MESSAGES.length)];
  return sendPushNotification(userId, msg.title, msg.body, '/dashboard');
}

// ══════════════════════════════════════════════
// 5. checkInactiveUsersAndReengage()
//    Called by cron — finds users inactive 3+ days
// ══════════════════════════════════════════════
async function checkInactiveUsersAndReengage() {
  console.log('🔔 Notification Service — Checking for inactive users...');

  try {
    const result = await db.query(
      `SELECT id FROM users
       WHERE notification_enabled = TRUE
         AND last_login IS NOT NULL
         AND last_login < NOW() - INTERVAL '3 days'
         AND id NOT IN (
           SELECT DISTINCT user_id FROM notifications_log
           WHERE notification_type = 'reengagement'
             AND sent_at > NOW() - INTERVAL '3 days'
         )`
    );

    let sent = 0;
    for (const user of result.rows) {
      await sendReengagementNotification(user.id);
      sent++;
    }

    console.log(`🔔 Re-engagement sent to ${sent} inactive users`);
  } catch (err) {
    console.error('Notification Service — reengagement check error:', err.message);
  }
}

// ══════════════════════════════════════════════
// 6. registerToken(userId, token)
//    Saves the FCM token from the frontend
// ══════════════════════════════════════════════
async function registerToken(userId, token) {
  await db.query(
    'UPDATE users SET fcm_token = $1 WHERE id = $2',
    [token, userId]
  );
  return { success: true };
}

// ══════════════════════════════════════════════
// 7. getUserNotifications(userId, limit)
//    Returns in-app notification feed
// ══════════════════════════════════════════════
async function getUserNotifications(userId, limit = 20) {
  const result = await db.query(
    `SELECT id, notification_type, title, body, sent_at, read_at
     FROM notifications_log
     WHERE user_id = $1
     ORDER BY sent_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
}

// ══════════════════════════════════════════════
// 8. markAsRead(notificationId, userId)
// ══════════════════════════════════════════════
async function markAsRead(notificationId, userId) {
  await db.query(
    `UPDATE notifications_log
     SET read_at = NOW(), action_taken = TRUE
     WHERE id = $1 AND user_id = $2`,
    [notificationId, userId]
  );
}

module.exports = {
  sendPushNotification,
  checkPriceChangesAndNotify,
  sendWeeklyTrackerPrompt,
  sendReengagementNotification,
  checkInactiveUsersAndReengage,
  registerToken,
  getUserNotifications,
  markAsRead,
};
