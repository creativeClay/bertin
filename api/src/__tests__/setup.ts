import { sequelize } from '../models';

// Setup and teardown
beforeAll(async () => {
  // Sync all models once at the start
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

// Reset database before each test to ensure clean state
beforeEach(async () => {
  // Re-sync with force to drop and recreate all tables
  await sequelize.sync({ force: true });
});

export { sequelize };
