// ============================================
// PennyWise — Notification Routes
// ============================================

const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const notificationService = require('../services/notificationService');

const router = express.Router();

// All routes require authentication
router.use(protect);

// ── Register FCM token from browser ──
router.post('/register-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'FCM token is required.',
        code: 'VALIDATION_ERROR',
      });
    }

    await notificationService.registerToken(req.user.id, token);

    return res.status(200).json({
      success: true,
      message: 'Notification token registered.',
    });
  } catch (error) {
    console.error('Notification Route — register-token error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to register token.',
      code: 'SERVER_ERROR',
    });
  }
});

// ── Get user's notification feed ──
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const notifications = await notificationService.getUserNotifications(req.user.id, limit);

    return res.status(200).json({
      success: true,
      notifications,
      count: notifications.length,
    });
  } catch (error) {
    console.error('Notification Route — list error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications.',
      code: 'SERVER_ERROR',
    });
  }
});

// ── Mark notification as read ──
router.patch('/:id/read', async (req, res) => {
  try {
    const notifId = req.params.id;
    await notificationService.markAsRead(notifId, req.user.id);

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
    });
  } catch (error) {
    console.error('Notification Route — markAsRead error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update notification.',
      code: 'SERVER_ERROR',
    });
  }
});

// ── Unread count (for badge) ──
router.get('/unread-count', async (req, res) => {
  try {
    const { rows } = await require('../config/db').query(
      `SELECT COUNT(*) AS count FROM notifications_log
       WHERE user_id = $1 AND read_at IS NULL`,
      [req.user.id]
    );

    return res.status(200).json({
      success: true,
      unread: parseInt(rows[0].count, 10),
    });
  } catch (error) {
    return res.status(200).json({ success: true, unread: 0 });
  }
});

module.exports = router;
