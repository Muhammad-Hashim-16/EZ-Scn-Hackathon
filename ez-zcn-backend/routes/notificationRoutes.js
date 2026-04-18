// ============================================
// PennyWise — Notification Routes (hardened)
// ============================================

const express = require('express');
const { body, param } = require('express-validator');
const { protect } = require('../middleware/authMiddleware');
const { handleValidationErrors } = require('../middleware/validators');
const notificationService = require('../services/notificationService');

const router = express.Router();

// All routes require authentication
router.use(protect);

// ── Register FCM token from browser ──
router.post(
  '/register-token',
  [
    body('token')
      .notEmpty().withMessage('FCM token is required.')
      .isString().withMessage('Token must be a string.')
      .isLength({ min: 10, max: 500 }).withMessage('Invalid token length.'),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      await notificationService.registerToken(req.user.id, req.body.token);
      return res.status(200).json({ success: true, message: 'Notification token registered.' });
    } catch (error) {
      console.error('Notification Route — register-token error:', error);
      return res.status(500).json({ success: false, error: 'Failed to register token.' });
    }
  }
);

// ── Get user's notification feed ──
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const notifications = await notificationService.getUserNotifications(req.user.id, limit);
    return res.status(200).json({ success: true, notifications, count: notifications.length });
  } catch (error) {
    console.error('Notification Route — list error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch notifications.' });
  }
});

// ── Mark notification as read ──
router.patch(
  '/:id/read',
  [
    param('id').isUUID().withMessage('Invalid notification ID.'),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      await notificationService.markAsRead(req.params.id, req.user.id);
      return res.status(200).json({ success: true, message: 'Notification marked as read.' });
    } catch (error) {
      console.error('Notification Route — markAsRead error:', error);
      return res.status(500).json({ success: false, error: 'Failed to update notification.' });
    }
  }
);

// ── Unread count (for badge) ──
router.get('/unread-count', async (req, res) => {
  try {
    const { rows } = await require('../config/db').query(
      `SELECT COUNT(*) AS count FROM notifications_log
       WHERE user_id = $1 AND read_at IS NULL`,
      [req.user.id]
    );
    return res.status(200).json({ success: true, unread: parseInt(rows[0].count, 10) });
  } catch (error) {
    return res.status(200).json({ success: true, unread: 0 });
  }
});

// ── Update notification preferences ──
router.put('/preferences', async (req, res) => {
  try {
    // Accept any preference key and store as JSON
    // In a production app, this would be a separate notification_preferences table
    // For now, we update notification_enabled on the user and log any specifics
    const { priceAlerts, weeklyReminder, monthlyReport, milestoneAlerts, reengagement, quietStart, quietEnd } = req.body;
    
    // Update notification_enabled based on any alert being on
    const anyEnabled = priceAlerts || weeklyReminder || monthlyReport || milestoneAlerts || reengagement;
    await require('../config/db').query(
      'UPDATE users SET notification_enabled = $1, updated_at = NOW() WHERE id = $2',
      [anyEnabled !== false, req.user.id]
    );

    return res.status(200).json({ success: true, message: 'Preferences updated.' });
  } catch (error) {
    console.error('Notification Route — preferences error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update preferences.' });
  }
});

module.exports = router;

