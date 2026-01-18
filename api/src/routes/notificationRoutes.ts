import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAll
} from '../controllers/notificationController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/notifications - Get all notifications
router.get('/', getNotifications);

// GET /api/notifications/unread-count - Get unread notification count
router.get('/unread-count', getUnreadCount);

// PUT /api/notifications/read-all - Mark all as read
router.put('/read-all', markAllAsRead);

// PUT /api/notifications/:id/read - Mark single notification as read
router.put('/:id/read', markAsRead);

// DELETE /api/notifications/clear - Clear all notifications
router.delete('/clear', clearAll);

// DELETE /api/notifications/:id - Delete single notification
router.delete('/:id', deleteNotification);

export default router;
