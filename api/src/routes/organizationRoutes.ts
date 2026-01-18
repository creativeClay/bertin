import { Router } from 'express';
import multer from 'multer';
import {
  getOrganization,
  getOrganizationMembers,
  updateOrganization,
  removeMember,
  updateMemberRole
} from '../controllers/organizationController';
import {
  createInvite,
  getInvites,
  cancelInvite,
  resendInvite,
  bulkCreateInvites
} from '../controllers/inviteController';
import { authenticate } from '../middleware/auth';

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

// All routes require authentication
router.use(authenticate);

// Organization routes
router.get('/', getOrganization);
router.put('/', updateOrganization);
router.get('/members', getOrganizationMembers);
router.delete('/members/:memberId', removeMember);
router.put('/members/:memberId/role', updateMemberRole);

// Invite routes (under organization)
router.post('/invites', createInvite);
router.get('/invites', getInvites);
router.post('/invites/bulk', upload.single('file'), bulkCreateInvites);
router.post('/invites/:id/resend', resendInvite);
router.delete('/invites/:id', cancelInvite);

export default router;
