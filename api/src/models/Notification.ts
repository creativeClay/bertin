import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type NotificationType = 'task_created' | 'task_updated' | 'task_deleted' | 'task_assigned' | 'task_due_soon' | 'invite_received' | 'info';

interface NotificationAttributes {
  id: number;
  user_id: number;
  org_id: number;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  task_id: number | null;
  actor_id: number | null; // User who triggered the notification
  createdAt?: Date;
  updatedAt?: Date;
}

interface NotificationCreationAttributes extends Optional<NotificationAttributes, 'id' | 'read' | 'task_id' | 'actor_id'> {}

class Notification extends Model<NotificationAttributes, NotificationCreationAttributes> implements NotificationAttributes {
  public id!: number;
  public user_id!: number;
  public org_id!: number;
  public type!: NotificationType;
  public title!: string;
  public message!: string;
  public read!: boolean;
  public task_id!: number | null;
  public actor_id!: number | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Notification.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    org_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'organizations',
        key: 'id'
      }
    },
    type: {
      type: DataTypes.ENUM('task_created', 'task_updated', 'task_deleted', 'task_assigned', 'task_due_soon', 'invite_received', 'info'),
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    task_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'tasks',
        key: 'id'
      },
      onDelete: 'SET NULL'
    },
    actor_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'SET NULL'
    }
  },
  {
    sequelize,
    tableName: 'notifications',
    timestamps: true
  }
);

export default Notification;
