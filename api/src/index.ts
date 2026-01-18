import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import dotenv from 'dotenv';

import { sequelize } from './models';
import authRoutes from './routes/authRoutes';
import taskRoutes from './routes/taskRoutes';
import organizationRoutes from './routes/organizationRoutes';
import inviteRoutes from './routes/inviteRoutes';
import { initializeSocket } from './socket';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  credentials: true
}));
app.use(express.json());

// Initialize Socket.IO
initializeSocket(server);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/organization', organizationRoutes);
app.use('/api/invites', inviteRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Database connection and server start
const start = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Sync database (creates tables if they don't exist)
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('Database synchronized.');

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
};

start();
