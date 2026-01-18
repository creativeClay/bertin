import { Sequelize } from 'sequelize';

const isTest = process.env.NODE_ENV === 'test';

const sequelize = isTest
  ? new Sequelize({
      dialect: 'sqlite',
      storage: ':memory:',
      logging: false
    })
  : new Sequelize(
      process.env.DB_NAME || 'taskdb',
      process.env.DB_USER || 'user',
      process.env.DB_PASSWORD || 'password',
      {
        host: process.env.DB_HOST || 'localhost',
        dialect: 'postgres',
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        pool: {
          max: 5,
          min: 0,
          acquire: 30000,
          idle: 10000
        }
      }
    );

export default sequelize;
