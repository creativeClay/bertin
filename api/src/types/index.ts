import { Request } from 'express';

export type UserRole = 'admin' | 'member';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    email: string;
    org_id: number | null;
    role: UserRole;
  };
}

export interface JwtPayload {
  id: number;
  username: string;
  email: string;
  org_id: number | null;
  role: UserRole;
}

export type TaskStatus = 'Pending' | 'In Progress' | 'Completed';

export interface TaskNotification {
  type: 'task_created' | 'task_updated' | 'task_deleted' | 'task_assigned';
  taskId: number;
  taskTitle: string;
  message: string;
  userId: number;
}
