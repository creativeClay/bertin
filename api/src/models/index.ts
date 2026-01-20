import sequelize from '../config/database';
import User from './User';
import Task from './Task';
import Organization from './Organization';
import Invite from './Invite';
import Notification from './Notification';
import TaskAssignee from './TaskAssignee';

// Organization associations
Organization.hasMany(User, { foreignKey: 'org_id', as: 'members' });
Organization.hasMany(Task, { foreignKey: 'org_id', as: 'tasks' });
Organization.hasMany(Invite, { foreignKey: 'org_id', as: 'invites' });
Organization.hasMany(Notification, { foreignKey: 'org_id', as: 'notifications' });
Organization.belongsTo(User, { foreignKey: 'created_by', as: 'owner' });

// User associations
User.belongsTo(Organization, { foreignKey: 'org_id', as: 'organization' });
User.hasMany(Task, { foreignKey: 'created_by', as: 'createdTasks' });
User.hasMany(Invite, { foreignKey: 'invited_by', as: 'sentInvites' });
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
User.hasMany(Notification, { foreignKey: 'actor_id', as: 'triggeredNotifications' });
User.belongsTo(User, { foreignKey: 'invited_by', as: 'inviter' });

// Task associations
Task.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
Task.belongsTo(Organization, { foreignKey: 'org_id', as: 'organization' });
Task.hasMany(Notification, { foreignKey: 'task_id', as: 'notifications' });

// Task <-> User many-to-many through TaskAssignee
Task.belongsToMany(User, {
  through: TaskAssignee,
  foreignKey: 'task_id',
  otherKey: 'user_id',
  as: 'assignees'
});
User.belongsToMany(Task, {
  through: TaskAssignee,
  foreignKey: 'user_id',
  otherKey: 'task_id',
  as: 'assignedTasks'
});

// Invite associations
Invite.belongsTo(Organization, { foreignKey: 'org_id', as: 'organization' });
Invite.belongsTo(User, { foreignKey: 'invited_by', as: 'inviter' });

// Notification associations
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Notification.belongsTo(User, { foreignKey: 'actor_id', as: 'actor' });
Notification.belongsTo(Organization, { foreignKey: 'org_id', as: 'organization' });
Notification.belongsTo(Task, { foreignKey: 'task_id', as: 'task' });

export { sequelize, User, Task, Organization, Invite, Notification, TaskAssignee };
