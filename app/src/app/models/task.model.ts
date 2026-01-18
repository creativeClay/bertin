import { User } from './user.model';

export type TaskStatus = 'Pending' | 'In Progress' | 'Completed';

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  due_date: string | null;
  assigned_to: number | null;
  created_by: number;
  assignee?: User | null;
  creator?: User;
  createdAt: string;
  updatedAt: string;
}

export interface TaskStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  status?: TaskStatus;
  due_date?: string;
  assigned_to?: number;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: TaskStatus;
  due_date?: string;
  assigned_to?: number;
}

export interface TaskNotification {
  type: 'task_created' | 'task_updated' | 'task_deleted' | 'task_assigned';
  taskId?: number;
  taskTitle?: string;
  message: string;
  userId?: number;
  notification?: import('./notification.model').Notification;
}
