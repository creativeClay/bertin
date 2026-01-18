import { DataTypes, Model, Optional } from 'sequelize';
import bcrypt from 'bcryptjs';
import sequelize from '../config/database';

export type UserRole = 'admin' | 'member';

interface UserAttributes {
  id: number;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  email: string;
  password: string;
  org_id: number | null;
  role: UserRole;
  invited_by: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'org_id' | 'role' | 'invited_by' | 'middle_name'> {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public first_name!: string;
  public last_name!: string;
  public middle_name!: string | null;
  public email!: string;
  public password!: string;
  public org_id!: number | null;
  public role!: UserRole;
  public invited_by!: number | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Virtual getter for full name
  public get full_name(): string {
    if (this.middle_name) {
      return `${this.first_name} ${this.middle_name} ${this.last_name}`;
    }
    return `${this.first_name} ${this.last_name}`;
  }

  // Virtual getter for display name (first name + last initial)
  public get display_name(): string {
    return `${this.first_name} ${this.last_name.charAt(0)}.`;
  }

  // Virtual getter for initials
  public get initials(): string {
    return `${this.first_name.charAt(0)}${this.last_name.charAt(0)}`.toUpperCase();
  }

  public async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }

  public isAdmin(): boolean {
    return this.role === 'admin';
  }

  public toJSON(): any {
    const values = { ...this.get() } as any;
    delete values.password;
    // Add virtual fields
    values.full_name = this.full_name;
    values.display_name = this.display_name;
    values.initials = this.initials;
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
    first_name: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    last_name: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    middle_name: {
      type: DataTypes.STRING(50),
      allowNull: true
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
