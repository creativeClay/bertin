import { User } from './user.model';
import { Task } from './task.model';

export type NotificationType = 'task_created' | 'task_updated' | 'task_deleted' | 'task_assigned' | 'task_due_soon' | 'invite_received' | 'info';

export interface Notification {
  id: number;
  user_id: number;
  org_id: number;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  task_id: number | null;
  actor_id: number | null;
  actor?: User;
  task?: Task;
  createdAt: string;
  updatedAt: string;
}
