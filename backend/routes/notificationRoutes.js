const express = require('express');
const router = express.Router();
const { getNotifications, getUnreadCount, markAllRead } = require('../controllers/notificationController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, getNotifications);
router.get('/unread-count', authMiddleware, getUnreadCount);
router.patch('/read-all', authMiddleware, markAllRead);

module.exports = router;
