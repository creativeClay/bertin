import { Response } from 'express';
import { Task, User, Organization, TaskAssignee } from '../models';
import { AuthRequest, TaskStatus } from '../types';
import { getIO } from '../socket';
import { sendTaskNotificationEmail } from '../services/emailService';
import { createNotification } from './notificationController';
import * as XLSX from 'xlsx';
import { Op } from 'sequelize';

export const createTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description, status, due_date, assigned_to } = req.body;
    const created_by = req.user!.id;
    const org_id = req.user!.org_id!;

    if (!title) {
      res.status(400).json({ error: 'Title is required' });
      return;
    }

    // Validate assigned_to users are in same org (can be array or single value)
    const assigneeIds: number[] = Array.isArray(assigned_to) ? assigned_to : (assigned_to ? [assigned_to] : []);

    if (assigneeIds.length > 0) {
      const validAssignees = await User.findAll({
        where: { id: { [Op.in]: assigneeIds }, org_id }
      });
      if (validAssignees.length !== assigneeIds.length) {
        res.status(400).json({ error: 'All assigned users must be members of your organization' });
        return;
      }
    }

    const task = await Task.create({
      title,
      description,
      status: status || 'Pending',
      due_date,
      created_by,
      org_id
    });

    // Set assignees via junction table
    if (assigneeIds.length > 0) {
      await task.setAssignees(assigneeIds);
    }

    const taskWithAssociations = await Task.findByPk(task.id, {
      include: [
        { model: User, as: 'assignees', attributes: ['id', 'first_name', 'last_name', 'email'], through: { attributes: [] } },
        { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name', 'email'] }
      ]
    });

    // Emit real-time update to organization
    const io = getIO();
    io.to(`org_${org_id}`).emit('task_update', { action: 'created', task: taskWithAssociations });

    // Create notifications and send emails to all assignees
    if (assigneeIds.length > 0) {
      const creator = await User.findByPk(created_by);
      const organization = await Organization.findByPk(org_id);

      for (const assigneeId of assigneeIds) {
        const assignee = await User.findByPk(assigneeId);

        // Save notification to database (also sends Socket.IO notification)
        await createNotification(
          assigneeId,
          org_id,
          'task_created',
          'New Task Assigned',
          `New task assigned to you: ${task.title}`,
          task.id,
          created_by
        );

        // Email notification
        if (assignee?.email) {
          sendTaskNotificationEmail('task_created', {
            recipientEmail: assignee.email,
            recipientName: assignee.full_name,
            taskTitle: task.title,
            taskDescription: task.description || undefined,
            taskStatus: task.status,
            taskDueDate: task.due_date ? new Date(task.due_date).toLocaleDateString() : undefined,
            assignerName: creator?.full_name,
            organizationName: organization?.name
          });
        }
      }
    }

    res.status(201).json({ task: taskWithAssociations });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTasks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, assigned_to, page = '1', limit = '10' } = req.query;
    const org_id = req.user!.org_id!;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 10));
    const offset = (pageNum - 1) * limitNum;

    const where: any = { org_id };
    if (status) where.status = status as TaskStatus;

    // Build include array
    const include: any[] = [
      { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name', 'email'] }
    ];

    // Handle assignee filter via junction table
    if (assigned_to) {
      include.push({
        model: User,
        as: 'assignees',
        attributes: ['id', 'first_name', 'last_name', 'email'],
        through: { attributes: [] },
        where: { id: Number(assigned_to) },
        required: true
      });
    } else {
      include.push({
        model: User,
        as: 'assignees',
        attributes: ['id', 'first_name', 'last_name', 'email'],
        through: { attributes: [] }
      });
    }

    const { count, rows: tasks } = await Task.findAndCountAll({
      where,
      include,
      order: [['createdAt', 'DESC']],
      limit: limitNum,
      offset,
      distinct: true
    });

    const totalPages = Math.ceil(count / limitNum);

    res.json({
      tasks,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });
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
        { model: User, as: 'assignees', attributes: ['id', 'first_name', 'last_name', 'email'], through: { attributes: [] } },
        { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name', 'email'] }
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

    const task = await Task.findOne({
      where: { id, org_id },
      include: [{ model: User, as: 'assignees', attributes: ['id', 'first_name', 'last_name', 'email'], through: { attributes: [] } }]
    });

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Get previous assignees
    const previousAssignees = await task.getAssignees();
    const previousAssigneeIds = previousAssignees.map(u => u.id);
    const previousStatus = task.status;

    // Validate new assignees if provided
    const newAssigneeIds: number[] = assigned_to !== undefined
      ? (Array.isArray(assigned_to) ? assigned_to : (assigned_to ? [assigned_to] : []))
      : previousAssigneeIds;

    if (assigned_to !== undefined && newAssigneeIds.length > 0) {
      const validAssignees = await User.findAll({
        where: { id: { [Op.in]: newAssigneeIds }, org_id }
      });
      if (validAssignees.length !== newAssigneeIds.length) {
        res.status(400).json({ error: 'All assigned users must be members of your organization' });
        return;
      }
    }

    await task.update({
      title: title ?? task.title,
      description: description ?? task.description,
      status: status ?? task.status,
      due_date: due_date ?? task.due_date
    });

    // Update assignees if provided
    if (assigned_to !== undefined) {
      await task.setAssignees(newAssigneeIds);
    }

    const updatedTask = await Task.findByPk(id, {
      include: [
        { model: User, as: 'assignees', attributes: ['id', 'first_name', 'last_name', 'email'], through: { attributes: [] } },
        { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name', 'email'] }
      ]
    });

    // Emit real-time update to organization
    const io = getIO();
    io.to(`org_${org_id}`).emit('task_update', { action: 'updated', task: updatedTask });

    const currentUserId = req.user!.id;
    const currentUser = await User.findByPk(currentUserId);
    const organization = await Organization.findByPk(org_id);

    // Get final assignee IDs after update
    const finalAssigneeIds = assigned_to !== undefined ? newAssigneeIds : previousAssigneeIds;

    // Notify if status changed
    if (status && status !== previousStatus) {
      // Notify all assignees (except the one making the change)
      for (const assigneeId of finalAssigneeIds) {
        if (assigneeId !== currentUserId) {
          await createNotification(
            assigneeId,
            org_id,
            'task_updated',
            'Task Updated',
            `Task "${task.title}" status changed to ${status}`,
            task.id,
            currentUserId
          );

          const assignee = await User.findByPk(assigneeId);
          if (assignee?.email) {
            sendTaskNotificationEmail('task_updated', {
              recipientEmail: assignee.email,
              recipientName: assignee.full_name,
              taskTitle: task.title,
              taskDescription: task.description || undefined,
              taskStatus: task.status,
              taskDueDate: task.due_date ? new Date(task.due_date).toLocaleDateString() : undefined,
              assignerName: currentUser?.full_name,
              organizationName: organization?.name
            });
          }
        }
      }

      // Notify creator (if different from actor and not an assignee)
      if (task.created_by !== currentUserId && !finalAssigneeIds.includes(task.created_by)) {
        await createNotification(
          task.created_by,
          org_id,
          'task_updated',
          'Task Status Updated',
          `Task "${task.title}" status changed to ${status}`,
          task.id,
          currentUserId
        );

        const creator = await User.findByPk(task.created_by);
        if (creator?.email) {
          sendTaskNotificationEmail('task_updated', {
            recipientEmail: creator.email,
            recipientName: creator.full_name,
            taskTitle: task.title,
            taskDescription: task.description || undefined,
            taskStatus: task.status,
            taskDueDate: task.due_date ? new Date(task.due_date).toLocaleDateString() : undefined,
            assignerName: currentUser?.full_name,
            organizationName: organization?.name
          });
        }
      }
    }

    // Handle assignee changes
    if (assigned_to !== undefined) {
      // Find newly added assignees
      const addedAssignees = newAssigneeIds.filter(id => !previousAssigneeIds.includes(id));
      // Find removed assignees
      const removedAssignees = previousAssigneeIds.filter(id => !newAssigneeIds.includes(id));

      // Notify newly added assignees (except the one making the change)
      for (const assigneeId of addedAssignees) {
        if (assigneeId !== currentUserId) {
          await createNotification(
            assigneeId,
            org_id,
            'task_assigned',
            'Task Assigned',
            `You have been assigned to task: ${task.title}`,
            task.id,
            currentUserId
          );

          const assignee = await User.findByPk(assigneeId);
          if (assignee?.email) {
            sendTaskNotificationEmail('task_assigned', {
              recipientEmail: assignee.email,
              recipientName: assignee.full_name,
              taskTitle: task.title,
              taskDescription: task.description || undefined,
              taskStatus: task.status,
              taskDueDate: task.due_date ? new Date(task.due_date).toLocaleDateString() : undefined,
              assignerName: currentUser?.full_name,
              organizationName: organization?.name
            });
          }
        }
      }

      // Notify removed assignees (except the one making the change)
      for (const assigneeId of removedAssignees) {
        if (assigneeId !== currentUserId) {
          await createNotification(
            assigneeId,
            org_id,
            'task_updated',
            'Task Reassigned',
            `You have been unassigned from task: ${task.title}`,
            task.id,
            currentUserId
          );

          const assignee = await User.findByPk(assigneeId);
          if (assignee?.email) {
            sendTaskNotificationEmail('task_updated', {
              recipientEmail: assignee.email,
              recipientName: assignee.full_name,
              taskTitle: task.title,
              taskDescription: task.description || undefined,
              taskStatus: task.status,
              taskDueDate: task.due_date ? new Date(task.due_date).toLocaleDateString() : undefined,
              assignerName: currentUser?.full_name,
              organizationName: organization?.name
            });
          }
        }
      }

      // Notify creator if assignees changed (if not actor and not already notified)
      if ((addedAssignees.length > 0 || removedAssignees.length > 0) &&
          task.created_by !== currentUserId &&
          !addedAssignees.includes(task.created_by) &&
          !removedAssignees.includes(task.created_by)) {
        const newAssigneeNames = await User.findAll({
          where: { id: { [Op.in]: newAssigneeIds } },
          attributes: ['first_name', 'last_name']
        });
        const assigneeNamesStr = newAssigneeNames.map(u => `${u.first_name} ${u.last_name}`).join(', ') || 'no one';

        await createNotification(
          task.created_by,
          org_id,
          'task_updated',
          'Task Reassigned',
          `Task "${task.title}" was reassigned to ${assigneeNamesStr}`,
          task.id,
          currentUserId
        );

        const creator = await User.findByPk(task.created_by);
        if (creator?.email) {
          sendTaskNotificationEmail('task_updated', {
            recipientEmail: creator.email,
            recipientName: creator.full_name,
            taskTitle: task.title,
            taskDescription: task.description || undefined,
            taskStatus: task.status,
            taskDueDate: task.due_date ? new Date(task.due_date).toLocaleDateString() : undefined,
            assignerName: currentUser?.full_name,
            organizationName: organization?.name
          });
        }
      }
    }

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

    const task = await Task.findOne({
      where: { id, org_id },
      include: [{ model: User, as: 'assignees', attributes: ['id', 'first_name', 'last_name', 'email'], through: { attributes: [] } }]
    });

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const taskId = task.id;
    const taskTitle = task.title;
    const taskDescription = task.description;
    const currentUserId = req.user!.id;
    const assignees = task.assignees || [];

    // Get current user and organization info
    const organization = await Organization.findByPk(org_id);
    const currentUser = await User.findByPk(currentUserId);

    // Notify all assignees before deleting
    for (const assignee of assignees) {
      await createNotification(
        assignee.id,
        org_id,
        'task_deleted',
        'Task Deleted',
        `Task "${taskTitle}" has been deleted`,
        null, // task_id is null since task is being deleted
        currentUserId
      );

      if (assignee.email) {
        sendTaskNotificationEmail('task_deleted', {
          recipientEmail: assignee.email,
          recipientName: `${assignee.first_name} ${assignee.last_name}`,
          taskTitle: taskTitle,
          taskDescription: taskDescription || undefined,
          assignerName: currentUser?.full_name,
          organizationName: organization?.name
        });
      }
    }

    await task.destroy();

    // Emit real-time update to organization
    const io = getIO();
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
      attributes: ['id', 'first_name', 'last_name', 'email', 'role']
    });

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

interface BulkTaskRow {
  title: string;
  description?: string;
  status?: TaskStatus;
  due_date?: string;
  assigned_to_email?: string;
}

export const bulkCreateTasks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const created_by = req.user!.id;
    const org_id = req.user!.org_id!;

    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded. Please upload a CSV or Excel file.' });
      return;
    }

    const fileBuffer = req.file.buffer;
    const fileName = req.file.originalname.toLowerCase();

    let rows: BulkTaskRow[] = [];

    if (fileName.endsWith('.csv')) {
      // Parse CSV
      const content = fileBuffer.toString('utf-8');
      const lines = content.split(/\r?\n/).filter(line => line.trim());

      if (lines.length < 2) {
        res.status(400).json({ error: 'CSV file must have a header row and at least one data row' });
        return;
      }

      // Parse header
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^["']|["']$/g, ''));

      // Parse data rows
      for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].split(',').map(cell => cell.trim().replace(/^["']|["']$/g, ''));
        const row: BulkTaskRow = { title: '' };

        headers.forEach((header, index) => {
          const value = cells[index] || '';
          if (header === 'title') row.title = value;
          else if (header === 'description') row.description = value;
          else if (header === 'status') row.status = value as TaskStatus;
          else if (header === 'due_date' || header === 'duedate' || header === 'due date') row.due_date = value;
          else if (header === 'assigned_to' || header === 'assignee' || header === 'email' || header === 'assigned_to_email') row.assigned_to_email = value;
        });

        if (row.title) {
          rows.push(row);
        }
      }
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      // Parse Excel
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);

      rows = data.map(row => {
        const normalizedRow: BulkTaskRow = { title: '' };

        Object.entries(row).forEach(([key, value]) => {
          const lowerKey = key.toLowerCase().trim();
          const strValue = String(value || '').trim();

          if (lowerKey === 'title') normalizedRow.title = strValue;
          else if (lowerKey === 'description') normalizedRow.description = strValue;
          else if (lowerKey === 'status') normalizedRow.status = strValue as TaskStatus;
          else if (lowerKey === 'due_date' || lowerKey === 'duedate' || lowerKey === 'due date') normalizedRow.due_date = strValue;
          else if (lowerKey === 'assigned_to' || lowerKey === 'assignee' || lowerKey === 'email' || lowerKey === 'assigned_to_email') normalizedRow.assigned_to_email = strValue;
        });

        return normalizedRow;
      }).filter(row => row.title);
    } else {
      res.status(400).json({ error: 'Invalid file format. Please upload a CSV or Excel file.' });
      return;
    }

    if (rows.length === 0) {
      res.status(400).json({ error: 'No valid tasks found in the file. Ensure you have a "title" column.' });
      return;
    }

    // Get all users in org for email lookup
    const orgUsers = await User.findAll({ where: { org_id } });
    const emailToUserId = new Map(orgUsers.map(u => [u.email.toLowerCase(), u.id]));

    const organization = await Organization.findByPk(org_id);
    const creator = await User.findByPk(created_by);
    const io = getIO();

    const results = {
      success: [] as { title: string; id: number }[],
      failed: [] as { title: string; reason: string }[]
    };

    const validStatuses: TaskStatus[] = ['Pending', 'In Progress', 'Completed'];

    for (const row of rows) {
      try {
        // Validate status
        let status: TaskStatus = 'Pending';
        if (row.status) {
          if (validStatuses.includes(row.status)) {
            status = row.status;
          } else {
            results.failed.push({ title: row.title, reason: `Invalid status: ${row.status}` });
            continue;
          }
        }

        // Resolve assignees by email (support comma-separated emails)
        const assigneeIds: number[] = [];
        if (row.assigned_to_email) {
          const emails = row.assigned_to_email.split(';').map(e => e.trim().toLowerCase());
          let allFound = true;
          for (const email of emails) {
            if (email) {
              const userId = emailToUserId.get(email);
              if (!userId) {
                results.failed.push({ title: row.title, reason: `User not found: ${email}` });
                allFound = false;
                break;
              }
              assigneeIds.push(userId);
            }
          }
          if (!allFound) continue;
        }

        // Parse due date
        let due_date: Date | null = null;
        if (row.due_date) {
          const parsed = new Date(row.due_date);
          if (!isNaN(parsed.getTime())) {
            due_date = parsed;
          }
        }

        // Create task
        const task = await Task.create({
          title: row.title,
          description: row.description || null,
          status,
          due_date,
          created_by,
          org_id
        });

        // Set assignees
        if (assigneeIds.length > 0) {
          await task.setAssignees(assigneeIds);
        }

        const taskWithAssociations = await Task.findByPk(task.id, {
          include: [
            { model: User, as: 'assignees', attributes: ['id', 'first_name', 'last_name', 'email'], through: { attributes: [] } },
            { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name', 'email'] }
          ]
        });

        // Emit real-time update
        io.to(`org_${org_id}`).emit('task_update', { action: 'created', task: taskWithAssociations });

        // Notify all assignees
        for (const assigneeId of assigneeIds) {
          const assignee = orgUsers.find(u => u.id === assigneeId);

          await createNotification(
            assigneeId,
            org_id,
            'task_created',
            'New Task Assigned',
            `New task assigned to you: ${task.title}`,
            task.id,
            created_by
          );

          if (assignee?.email) {
            sendTaskNotificationEmail('task_created', {
              recipientEmail: assignee.email,
              recipientName: assignee.full_name,
              taskTitle: task.title,
              taskDescription: task.description || undefined,
              taskStatus: task.status,
              taskDueDate: task.due_date ? new Date(task.due_date).toLocaleDateString() : undefined,
              assignerName: creator?.full_name,
              organizationName: organization?.name
            }).catch(err => console.error('Failed to send email:', err));
          }
        }

        results.success.push({ title: task.title, id: task.id });
      } catch (error) {
        results.failed.push({ title: row.title, reason: 'Internal error' });
      }
    }

    res.status(201).json({
      message: `Bulk task creation completed: ${results.success.length} created, ${results.failed.length} failed`,
      results
    });
  } catch (error) {
    console.error('Bulk create tasks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
