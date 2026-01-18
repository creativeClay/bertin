import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { TaskStatus } from '../types';

interface TaskAttributes {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  due_date: Date | null;
  assigned_to: number | null;
  created_by: number;
  org_id: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface TaskCreationAttributes extends Optional<TaskAttributes, 'id' | 'description' | 'status' | 'due_date' | 'assigned_to'> {}

class Task extends Model<TaskAttributes, TaskCreationAttributes> implements TaskAttributes {
  public id!: number;
  public title!: string;
  public description!: string | null;
  public status!: TaskStatus;
  public due_date!: Date | null;
  public assigned_to!: number | null;
  public created_by!: number;
  public org_id!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Task.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('Pending', 'In Progress', 'Completed'),
      defaultValue: 'Pending'
    },
    due_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    assigned_to: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    created_by: {
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
    }
  },
  {
    sequelize,
    tableName: 'tasks',
    timestamps: true
  }
);

export default Task;
