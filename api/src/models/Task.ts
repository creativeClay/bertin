import { DataTypes, Model, Optional, BelongsToManyGetAssociationsMixin, BelongsToManySetAssociationsMixin, BelongsToManyAddAssociationsMixin, BelongsToManyRemoveAssociationsMixin } from 'sequelize';
import sequelize from '../config/database';
import { TaskStatus } from '../types';
import User from './User';

interface TaskAttributes {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  due_date: Date | null;
  created_by: number;
  org_id: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface TaskCreationAttributes extends Optional<TaskAttributes, 'id' | 'description' | 'status' | 'due_date'> {}

class Task extends Model<TaskAttributes, TaskCreationAttributes> implements TaskAttributes {
  public id!: number;
  public title!: string;
  public description!: string | null;
  public status!: TaskStatus;
  public due_date!: Date | null;
  public created_by!: number;
  public org_id!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Assignees association methods (many-to-many)
  public getAssignees!: BelongsToManyGetAssociationsMixin<User>;
  public setAssignees!: BelongsToManySetAssociationsMixin<User, number>;
  public addAssignees!: BelongsToManyAddAssociationsMixin<User, number>;
  public removeAssignees!: BelongsToManyRemoveAssociationsMixin<User, number>;

  // Virtual property populated by association
  public assignees?: User[];
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
