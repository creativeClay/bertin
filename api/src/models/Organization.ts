import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface OrganizationAttributes {
  id: number;
  name: string;
  slug: string;
  created_by: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface OrganizationCreationAttributes extends Optional<OrganizationAttributes, 'id'> {}

class Organization extends Model<OrganizationAttributes, OrganizationCreationAttributes> implements OrganizationAttributes {
  public id!: number;
  public name!: string;
  public slug!: string;
  public created_by!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Organization.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  },
  {
    sequelize,
    tableName: 'organizations',
    timestamps: true
  }
);

export default Organization;
