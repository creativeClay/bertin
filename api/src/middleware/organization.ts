import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';

export const requireOrganization = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user?.org_id) {
    res.status(403).json({ error: 'You must belong to an organization to access this resource' });
    return;
  }
  next();
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
};
