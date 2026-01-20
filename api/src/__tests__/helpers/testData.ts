import { User, Organization, Task, Invite, Notification } from '../../models';
import { generateToken } from '../../middleware/auth';

export const createTestOrganization = async (userId: number) => {
  return Organization.create({
    name: 'Test Organization',
    slug: 'test-org-' + Date.now(),
    created_by: userId
  });
};

export const createTestUser = async (overrides: Partial<{
  first_name: string;
  last_name: string;
  middle_name: string | null;
  email: string;
  password: string;
  org_id: number | null;
  role: 'admin' | 'member';
}> = {}) => {
  const timestamp = Date.now();
  const defaults = {
    first_name: 'Test',
    last_name: 'User' + timestamp,
    middle_name: null,
    email: `test${timestamp}@example.com`,
    password: 'password123',
    org_id: null,
    role: 'member' as const
  };

  return User.create({ ...defaults, ...overrides });
};

export const createTestAdmin = async () => {
  const timestamp = Date.now();
  const admin = await User.create({
    first_name: 'Admin',
    last_name: 'User' + timestamp,
    email: `admin${timestamp}@example.com`,
    password: 'password123',
    role: 'admin'
  });

  const org = await createTestOrganization(admin.id);
  admin.org_id = org.id;
  await admin.save();

  return { admin, org };
};

export const createTestTask = async (orgId: number, creatorId: number, overrides: Partial<{
  title: string;
  description: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  assigned_to: number | number[] | null;
  due_date: Date | null;
}> = {}) => {
  const { assigned_to, ...restOverrides } = overrides;
  const defaults = {
    title: 'Test Task',
    description: 'Test description',
    status: 'Pending' as const,
    due_date: null
  };

  const task = await Task.create({
    ...defaults,
    ...restOverrides,
    org_id: orgId,
    created_by: creatorId
  });

  // Handle assignees via junction table
  if (assigned_to) {
    const assigneeIds = Array.isArray(assigned_to) ? assigned_to : [assigned_to];
    await task.setAssignees(assigneeIds);
  }

  return task;
};

export const createTestInvite = async (orgId: number, invitedBy: number, email?: string) => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  return Invite.create({
    email: email || `invite${Date.now()}@example.com`,
    org_id: orgId,
    invited_by: invitedBy,
    expires_at: expiresAt
  });
};

export const getAuthToken = (user: User) => {
  return generateToken({
    id: user.id,
    email: user.email,
    org_id: user.org_id,
    role: user.role
  });
};

export const getNotificationsForUser = async (userId: number) => {
  return Notification.findAll({
    where: { user_id: userId },
    order: [['createdAt', 'DESC']]
  });
};

export const clearNotifications = async () => {
  return Notification.destroy({ where: {} });
};
