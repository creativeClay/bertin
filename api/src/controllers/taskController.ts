import { Response } from 'express';
import { Task, User } from '../models';
import { AuthRequest, TaskStatus } from '../types';
import { getIO } from '../socket';

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
      io.to(`user_${assigned_to}`).emit('notification', {
        type: 'task_created',
        taskId: task.id,
        taskTitle: task.title,
        message: `New task assigned to you: ${task.title}`,
        userId: assigned_to
      });
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

    // Notify if status changed
    if (status && status !== previousStatus && task.assigned_to) {
      io.to(`user_${task.assigned_to}`).emit('notification', {
        type: 'task_updated',
        taskId: task.id,
        taskTitle: task.title,
        message: `Task "${task.title}" status changed to ${status}`,
        userId: task.assigned_to
      });
    }

    // Notify if assigned to new user
    if (assigned_to && assigned_to !== previousAssignee) {
      io.to(`user_${assigned_to}`).emit('notification', {
        type: 'task_assigned',
        taskId: task.id,
        taskTitle: task.title,
        message: `You have been assigned to task: ${task.title}`,
        userId: assigned_to
      });
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
    const assignedTo = task.assigned_to;

    await task.destroy();

    // Emit real-time notification
    const io = getIO();
    if (assignedTo) {
      io.to(`user_${assignedTo}`).emit('notification', {
        type: 'task_deleted',
        taskId,
        taskTitle,
        message: `Task "${taskTitle}" has been deleted`,
        userId: assignedTo
      });
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
