import { Response } from 'express';
import { Task, User, Organization } from '../models';
import { AuthRequest, TaskStatus } from '../types';
import { getIO } from '../socket';
import { sendTaskNotificationEmail } from '../services/emailService';

export const createTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description, status, due_date, assigned_to } = req.body;
    const created_by = req.user!.id;
    const org_id = req.user!.org_id!;

    if (!title) {
      res.status(400).json({ error: 'Title is required' });
      return;
    }

    // Validate assigned_to is in same org
    if (assigned_to) {
      const assignee = await User.findOne({
        where: { id: assigned_to, org_id }
      });
      if (!assignee) {
        res.status(400).json({ error: 'Assigned user must be a member of your organization' });
        return;
      }
    }

    const task = await Task.create({
      title,
      description,
      status: status || 'Pending',
      due_date,
      assigned_to,
      created_by,
      org_id
    });

    const taskWithAssociations = await Task.findByPk(task.id, {
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'username', 'email'] },
        { model: User, as: 'creator', attributes: ['id', 'username', 'email'] }
      ]
    });

    // Emit real-time notification (scoped to org)
    const io = getIO();
    if (assigned_to) {
      // Socket.IO notification (in-app)
      io.to(`user_${assigned_to}`).emit('notification', {
        type: 'task_created',
        taskId: task.id,
        taskTitle: task.title,
        message: `New task assigned to you: ${task.title}`,
        userId: assigned_to
      });

      // Email notification
      const assignee = await User.findByPk(assigned_to);
      const creator = await User.findByPk(created_by);
      const organization = await Organization.findByPk(org_id);

      if (assignee?.email) {
        sendTaskNotificationEmail('task_created', {
          recipientEmail: assignee.email,
          recipientName: assignee.username,
          taskTitle: task.title,
          taskDescription: task.description || undefined,
          taskStatus: task.status,
          taskDueDate: task.due_date ? new Date(task.due_date).toLocaleDateString() : undefined,
          assignerName: creator?.username,
          organizationName: organization?.name
        });
      }
    }
    io.to(`org_${org_id}`).emit('task_update', { action: 'created', task: taskWithAssociations });

    res.status(201).json({ task: taskWithAssociations });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTasks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, assigned_to } = req.query;
    const org_id = req.user!.org_id!;

    const where: any = { org_id };
    if (status) where.status = status as TaskStatus;
    if (assigned_to) where.assigned_to = Number(assigned_to);

    const tasks = await Task.findAll({
      where,
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'username', 'email'] },
        { model: User, as: 'creator', attributes: ['id', 'username', 'email'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ tasks });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTaskById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const org_id = req.user!.org_id!;

    const task = await Task.findOne({
      where: { id, org_id },
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'username', 'email'] },
        { model: User, as: 'creator', attributes: ['id', 'username', 'email'] }
      ]
    });

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    res.json({ task });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, description, status, due_date, assigned_to } = req.body;
    const org_id = req.user!.org_id!;

    const task = await Task.findOne({ where: { id, org_id } });

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Validate assigned_to is in same org
    if (assigned_to) {
      const assignee = await User.findOne({
        where: { id: assigned_to, org_id }
      });
      if (!assignee) {
        res.status(400).json({ error: 'Assigned user must be a member of your organization' });
        return;
      }
    }

    const previousAssignee = task.assigned_to;
    const previousStatus = task.status;

    await task.update({
      title: title ?? task.title,
      description: description ?? task.description,
      status: status ?? task.status,
      due_date: due_date ?? task.due_date,
      assigned_to: assigned_to ?? task.assigned_to
    });

    const updatedTask = await Task.findByPk(id, {
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'username', 'email'] },
        { model: User, as: 'creator', attributes: ['id', 'username', 'email'] }
      ]
    });

    // Emit real-time notifications
    const io = getIO();
    const currentUser = req.user!;
    const organization = await Organization.findByPk(org_id);

    // Notify if status changed
    if (status && status !== previousStatus && task.assigned_to) {
      // Socket.IO notification (in-app)
      io.to(`user_${task.assigned_to}`).emit('notification', {
        type: 'task_updated',
        taskId: task.id,
        taskTitle: task.title,
        message: `Task "${task.title}" status changed to ${status}`,
        userId: task.assigned_to
      });

      // Email notification
      const assignee = await User.findByPk(task.assigned_to);
      if (assignee?.email) {
        sendTaskNotificationEmail('task_updated', {
          recipientEmail: assignee.email,
          recipientName: assignee.username,
          taskTitle: task.title,
          taskDescription: task.description || undefined,
          taskStatus: task.status,
          taskDueDate: task.due_date ? new Date(task.due_date).toLocaleDateString() : undefined,
          assignerName: currentUser.username,
          organizationName: organization?.name
        });
      }
    }

    // Notify if assigned to new user
    if (assigned_to && assigned_to !== previousAssignee) {
      // Socket.IO notification (in-app)
      io.to(`user_${assigned_to}`).emit('notification', {
        type: 'task_assigned',
        taskId: task.id,
        taskTitle: task.title,
        message: `You have been assigned to task: ${task.title}`,
        userId: assigned_to
      });

      // Email notification
      const newAssignee = await User.findByPk(assigned_to);
      if (newAssignee?.email) {
        sendTaskNotificationEmail('task_assigned', {
          recipientEmail: newAssignee.email,
          recipientName: newAssignee.username,
          taskTitle: task.title,
          taskDescription: task.description || undefined,
          taskStatus: task.status,
          taskDueDate: task.due_date ? new Date(task.due_date).toLocaleDateString() : undefined,
          assignerName: currentUser.username,
          organizationName: organization?.name
        });
      }
    }

    io.to(`org_${org_id}`).emit('task_update', { action: 'updated', task: updatedTask });

    res.json({ task: updatedTask });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const org_id = req.user!.org_id!;

    const task = await Task.findOne({ where: { id, org_id } });

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const taskId = task.id;
    const taskTitle = task.title;
    const taskDescription = task.description;
    const assignedTo = task.assigned_to;
    const currentUser = req.user!;

    // Get assignee info before deleting
    let assignee: User | null = null;
    let organization: Organization | null = null;
    if (assignedTo) {
      assignee = await User.findByPk(assignedTo);
      organization = await Organization.findByPk(org_id);
    }

    await task.destroy();

    // Emit real-time notification
    const io = getIO();
    if (assignedTo) {
      // Socket.IO notification (in-app)
      io.to(`user_${assignedTo}`).emit('notification', {
        type: 'task_deleted',
        taskId,
        taskTitle,
        message: `Task "${taskTitle}" has been deleted`,
        userId: assignedTo
      });

      // Email notification
      if (assignee?.email) {
        sendTaskNotificationEmail('task_deleted', {
          recipientEmail: assignee.email,
          recipientName: assignee.username,
          taskTitle: taskTitle,
          taskDescription: taskDescription || undefined,
          assignerName: currentUser.username,
          organizationName: organization?.name
        });
      }
    }
    io.to(`org_${org_id}`).emit('task_update', { action: 'deleted', taskId });

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTaskStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const org_id = req.user!.org_id!;

    const total = await Task.count({ where: { org_id } });
    const pending = await Task.count({ where: { org_id, status: 'Pending' } });
    const inProgress = await Task.count({ where: { org_id, status: 'In Progress' } });
    const completed = await Task.count({ where: { org_id, status: 'Completed' } });

    res.json({
      stats: {
        total,
        pending,
        inProgress,
        completed
      }
    });
  } catch (error) {
    console.error('Get task stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const org_id = req.user!.org_id!;

    const users = await User.findAll({
      where: { org_id },
      attributes: ['id', 'username', 'email', 'role']
    });

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
