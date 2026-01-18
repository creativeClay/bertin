import { Response } from 'express';
import { Organization, User } from '../models';
import { AuthRequest } from '../types';

const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    + '-' + Date.now().toString(36);
};

export const getOrganization = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user!.org_id;

    if (!orgId) {
      res.status(404).json({ error: 'No organization found' });
      return;
    }

    const organization = await Organization.findByPk(orgId, {
      include: [
        { model: User, as: 'owner', attributes: ['id', 'username', 'email'] }
      ]
    });

    if (!organization) {
      res.status(404).json({ error: 'Organization not found' });
      return;
    }

    res.json({ organization });
  } catch (error) {
    console.error('Get organization error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getOrganizationMembers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user!.org_id;

    if (!orgId) {
      res.status(404).json({ error: 'No organization found' });
      return;
    }

    const members = await User.findAll({
      where: { org_id: orgId },
      attributes: ['id', 'username', 'email', 'role', 'createdAt'],
      include: [
        { model: User, as: 'inviter', attributes: ['id', 'username'] }
      ],
      order: [['createdAt', 'ASC']]
    });

    res.json({ members });
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateOrganization = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user!.org_id;
    const { name } = req.body;

    if (!orgId) {
      res.status(404).json({ error: 'No organization found' });
      return;
    }

    if (req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Only admins can update organization' });
      return;
    }

    const organization = await Organization.findByPk(orgId);

    if (!organization) {
      res.status(404).json({ error: 'Organization not found' });
      return;
    }

    if (name) {
      organization.name = name;
      await organization.save();
    }

    res.json({ organization });
  } catch (error) {
    console.error('Update organization error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const removeMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user!.org_id;
    const { memberId } = req.params;

    if (!orgId) {
      res.status(404).json({ error: 'No organization found' });
      return;
    }

    if (req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Only admins can remove members' });
      return;
    }

    const member = await User.findOne({
      where: { id: memberId, org_id: orgId }
    });

    if (!member) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    if (member.role === 'admin') {
      res.status(400).json({ error: 'Cannot remove admin' });
      return;
    }

    // Remove user from organization
    member.org_id = null;
    member.role = 'member';
    await member.save();

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateMemberRole = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user!.org_id;
    const { memberId } = req.params;
    const { role } = req.body;

    if (!orgId) {
      res.status(404).json({ error: 'No organization found' });
      return;
    }

    if (req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Only admins can update member roles' });
      return;
    }

    if (!['admin', 'member'].includes(role)) {
      res.status(400).json({ error: 'Invalid role' });
      return;
    }

    const member = await User.findOne({
      where: { id: memberId, org_id: orgId }
    });

    if (!member) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    member.role = role;
    await member.save();

    res.json({ member: member.toJSON() });
  } catch (error) {
    console.error('Update member role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
