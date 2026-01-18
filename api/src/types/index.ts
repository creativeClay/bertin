import { Request } from 'express';

export type UserRole = 'admin' | 'member';

export interface JwtPayload {
  id: number;
  email: string;
  org_id: number | null;
  role: UserRole;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export type TaskStatus = 'Pending' | 'In Progress' | 'Completed';

export interface TaskNotification {
  type: 'task_created' | 'task_updated' | 'task_deleted' | 'task_assigned';
  taskId: number;
  taskTitle: string;
  message: string;
  userId: number;
}
