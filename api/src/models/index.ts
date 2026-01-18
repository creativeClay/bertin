import sequelize from '../config/database';
import User from './User';
import Task from './Task';
import Organization from './Organization';
import Invite from './Invite';

// Organization associations
Organization.hasMany(User, { foreignKey: 'org_id', as: 'members' });
Organization.hasMany(Task, { foreignKey: 'org_id', as: 'tasks' });
Organization.hasMany(Invite, { foreignKey: 'org_id', as: 'invites' });
Organization.belongsTo(User, { foreignKey: 'created_by', as: 'owner' });

// User associations
User.belongsTo(Organization, { foreignKey: 'org_id', as: 'organization' });
User.hasMany(Task, { foreignKey: 'assigned_to', as: 'assignedTasks' });
User.hasMany(Task, { foreignKey: 'created_by', as: 'createdTasks' });
User.hasMany(Invite, { foreignKey: 'invited_by', as: 'sentInvites' });
User.belongsTo(User, { foreignKey: 'invited_by', as: 'inviter' });

// Task associations
Task.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignee' });
Task.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
Task.belongsTo(Organization, { foreignKey: 'org_id', as: 'organization' });

// Invite associations
Invite.belongsTo(Organization, { foreignKey: 'org_id', as: 'organization' });
Invite.belongsTo(User, { foreignKey: 'invited_by', as: 'inviter' });

export { sequelize, User, Task, Organization, Invite };
