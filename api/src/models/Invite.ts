import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import crypto from 'crypto';

interface InviteAttributes {
  id: number;
  email: string;
  org_id: number;
  token: string;
  invited_by: number;
  accepted: boolean;
  expires_at: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface InviteCreationAttributes extends Optional<InviteAttributes, 'id' | 'token' | 'accepted'> {}

class Invite extends Model<InviteAttributes, InviteCreationAttributes> implements InviteAttributes {
  public id!: number;
  public email!: string;
  public org_id!: number;
  public token!: string;
  public invited_by!: number;
  public accepted!: boolean;
  public expires_at!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public isExpired(): boolean {
    return new Date() > this.expires_at;
  }
}

Invite.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        isEmail: true
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
    token: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
      defaultValue: () => crypto.randomBytes(32).toString('hex')
    },
    invited_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    accepted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false
    }
  },
  {
    sequelize,
    tableName: 'invites',
    timestamps: true
  }
);

export default Invite;
