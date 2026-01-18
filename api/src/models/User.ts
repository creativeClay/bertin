import { DataTypes, Model, Optional } from 'sequelize';
import bcrypt from 'bcryptjs';
import sequelize from '../config/database';

export type UserRole = 'admin' | 'member';

interface UserAttributes {
  id: number;
  username: string;
  email: string;
  password: string;
  org_id: number | null;
  role: UserRole;
  invited_by: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'org_id' | 'role' | 'invited_by'> {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public username!: string;
  public email!: string;
  public password!: string;
  public org_id!: number | null;
  public role!: UserRole;
  public invited_by!: number | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }

  public isAdmin(): boolean {
    return this.role === 'admin';
  }

  public toJSON(): Omit<UserAttributes, 'password'> {
    const values = { ...this.get() };
    delete (values as any).password;
    return values;
  }
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    org_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'organizations',
        key: 'id'
      }
    },
    role: {
      type: DataTypes.ENUM('admin', 'member'),
      defaultValue: 'member'
    },
    invited_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  },
  {
    sequelize,
    tableName: 'users',
    timestamps: true,
    hooks: {
      beforeCreate: async (user: User) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      beforeUpdate: async (user: User) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      }
    }
  }
);

export default User;
