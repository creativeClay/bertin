import { Router } from 'express';
import multer from 'multer';
import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  getTaskStats,
  getUsers,
  bulkCreateTasks
} from '../controllers/taskController';
import { authenticate } from '../middleware/auth';
import { requireOrganization } from '../middleware/organization';

const router = Router();

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    if (allowedTypes.includes(file.mimetype) ||
        file.originalname.endsWith('.csv') ||
        file.originalname.endsWith('.xlsx') ||
        file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'));
    }
  }
});

// All task routes require authentication and organization membership
router.use(authenticate);
router.use(requireOrganization);

router.get('/stats', getTaskStats);
router.get('/users', getUsers);
router.get('/', getTasks);
router.get('/:id', getTaskById);
router.post('/', createTask);
router.post('/bulk', upload.single('file'), bulkCreateTasks);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

export default router;
