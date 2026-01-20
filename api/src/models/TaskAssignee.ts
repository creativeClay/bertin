import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

interface TaskAssigneeAttributes {
  task_id: number;
  user_id: number;
}

class TaskAssignee extends Model<TaskAssigneeAttributes> implements TaskAssigneeAttributes {
  public task_id!: number;
  public user_id!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

TaskAssignee.init(
  {
    task_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'tasks',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    user_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    }
  },
  {
    sequelize,
    tableName: 'task_assignees',
    timestamps: true
  }
);

export default TaskAssignee;
