import { Router } from 'express';
import { getInviteByToken, acceptInvite } from '../controllers/inviteController';

const router = Router();

// Public routes (no auth required)
router.get('/:token', getInviteByToken);
router.post('/:token/accept', acceptInvite);

export default router;
