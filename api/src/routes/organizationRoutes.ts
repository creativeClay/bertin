import { Router } from 'express';
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
  cancelInvite
} from '../controllers/inviteController';
import { authenticate } from '../middleware/auth';

const router = Router();

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
router.delete('/invites/:id', cancelInvite);

export default router;
