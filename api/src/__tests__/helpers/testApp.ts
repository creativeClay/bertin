import express from 'express';
import cors from 'cors';
import authRoutes from '../../routes/authRoutes';
import taskRoutes from '../../routes/taskRoutes';
import organizationRoutes from '../../routes/organizationRoutes';
import inviteRoutes from '../../routes/inviteRoutes';

// Mock Socket.IO
jest.mock('../../socket', () => ({
  getIO: () => ({
    to: () => ({ emit: jest.fn() }),
    emit: jest.fn()
  }),
  initializeSocket: jest.fn()
}));

export const createTestApp = () => {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use('/api/auth', authRoutes);
  app.use('/api/tasks', taskRoutes);
  app.use('/api/organization', organizationRoutes);
  app.use('/api/invites', inviteRoutes);

  return app;
};
