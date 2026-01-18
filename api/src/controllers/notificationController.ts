import { Response } from 'express';
import { Notification, User, Task } from '../models';
import { AuthRequest } from '../types';
import { NotificationType } from '../models/Notification';
import { getIO } from '../socket';

// Get all notifications for the current user
export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user_id = req.user!.id;
    const { unread_only } = req.query;

    const where: any = { user_id };
    if (unread_only === 'true') {
      where.read = false;
    }

    const notifications = await Notification.findAll({
      where,
      include: [
        { model: User, as: 'actor', attributes: ['id', 'username', 'email'] },
        { model: Task, as: 'task', attributes: ['id', 'title', 'status'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: 100
    });

    res.json({ notifications });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get unread notification count
export const getUnreadCount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user_id = req.user!.id;

    const count = await Notification.count({
      where: { user_id, read: false }
    });

    res.json({ count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Mark a notification as read
export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user_id = req.user!.id;

    const notification = await Notification.findOne({
      where: { id, user_id }
    });

    if (!notification) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    await notification.update({ read: true });

    res.json({ notification });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user_id = req.user!.id;

    await Notification.update(
      { read: true },
      { where: { user_id, read: false } }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a notification
export const deleteNotification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user_id = req.user!.id;

    const notification = await Notification.findOne({
      where: { id, user_id }
    });

    if (!notification) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    await notification.destroy();

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Clear all notifications
export const clearAll = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user_id = req.user!.id;

    await Notification.destroy({
      where: { user_id }
    });

    res.json({ message: 'All notifications cleared' });
  } catch (error) {
    console.error('Clear all notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Helper function to create a notification (used by other controllers)
export const createNotification = async (
  user_id: number,
  org_id: number,
  type: NotificationType,
  title: string,
  message: string,
  task_id?: number | null,
  actor_id?: number | null
): Promise<Notification> => {
  const notification = await Notification.create({
    user_id,
    org_id,
    type,
    title,
    message,
    task_id: task_id || null,
    actor_id: actor_id || null
  });

  // Fetch with associations for Socket.IO broadcast
  const fullNotification = await Notification.findByPk(notification.id, {
    include: [
      { model: User, as: 'actor', attributes: ['id', 'username', 'email'] },
      { model: Task, as: 'task', attributes: ['id', 'title', 'status'] }
    ]
  });

  // Emit real-time notification via Socket.IO
  const io = getIO();
  io.to(`user_${user_id}`).emit('notification', {
    type,
    message,
    notification: fullNotification
  });

  return notification;
};
