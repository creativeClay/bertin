import { Router } from 'express';
import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  getTaskStats,
  getUsers
} from '../controllers/taskController';
import { authenticate } from '../middleware/auth';
import { requireOrganization } from '../middleware/organization';

const router = Router();

// All task routes require authentication and organization membership
router.use(authenticate);
router.use(requireOrganization);

router.get('/stats', getTaskStats);
router.get('/users', getUsers);
router.get('/', getTasks);
router.get('/:id', getTaskById);
router.post('/', createTask);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

export default router;
