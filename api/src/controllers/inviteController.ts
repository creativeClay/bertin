import { Request, Response } from 'express';
import { Invite, Organization, User } from '../models';
import { AuthRequest } from '../types';
import { generateToken } from '../middleware/auth';
import { sendInviteEmail } from '../services/emailService';

export const createInvite = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    const orgId = req.user!.org_id;
    const invitedBy = req.user!.id;

    if (!orgId) {
      res.status(400).json({ error: 'You must belong to an organization to invite members' });
      return;
    }

    if (req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Only admins can invite members' });
      return;
    }

    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    // Check if user already exists in org
    const existingUser = await User.findOne({
      where: { email, org_id: orgId }
    });

    if (existingUser) {
      res.status(400).json({ error: 'User is already a member of this organization' });
      return;
    }

    // Check for existing pending invite
    const existingInvite = await Invite.findOne({
      where: { email, org_id: orgId, accepted: false }
    });

    if (existingInvite && !existingInvite.isExpired()) {
      res.status(400).json({ error: 'An invite has already been sent to this email' });
      return;
    }

    // Delete expired invite if exists
    if (existingInvite) {
      await existingInvite.destroy();
    }

    // Create invite (expires in 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invite = await Invite.create({
      email,
      org_id: orgId,
      invited_by: invitedBy,
      expires_at: expiresAt
    });

    const inviteWithDetails = await Invite.findByPk(invite.id, {
      include: [
        { model: Organization, as: 'organization', attributes: ['id', 'name'] },
        { model: User, as: 'inviter', attributes: ['id', 'username'] }
      ]
    });

    // Send invite email
    const organization = await Organization.findByPk(orgId);
    const inviter = await User.findByPk(invitedBy);

    try {
      await sendInviteEmail(
        email,
        invite.token,
        organization?.name || 'Organization',
        inviter?.username || 'Admin'
      );
    } catch (emailError) {
      console.error('Failed to send invite email:', emailError);
      // Continue even if email fails - invite is still created
    }

    res.status(201).json({
      message: 'Invite sent successfully',
      invite: inviteWithDetails
    });
  } catch (error) {
    console.error('Create invite error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getInvites = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user!.org_id;

    if (!orgId) {
      res.status(400).json({ error: 'No organization found' });
      return;
    }

    if (req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Only admins can view invites' });
      return;
    }

    const invites = await Invite.findAll({
      where: { org_id: orgId },
      include: [
        { model: User, as: 'inviter', attributes: ['id', 'username'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ invites });
  } catch (error) {
    console.error('Get invites error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getInviteByToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;

    const invite = await Invite.findOne({
      where: { token },
      include: [
        { model: Organization, as: 'organization', attributes: ['id', 'name'] },
        { model: User, as: 'inviter', attributes: ['id', 'username'] }
      ]
    });

    if (!invite) {
      res.status(404).json({ error: 'Invite not found' });
      return;
    }

    if (invite.accepted) {
      res.status(400).json({ error: 'Invite has already been accepted' });
      return;
    }

    if (invite.isExpired()) {
      res.status(400).json({ error: 'Invite has expired' });
      return;
    }

    res.json({ invite });
  } catch (error) {
    console.error('Get invite error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const acceptInvite = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    const invite = await Invite.findOne({
      where: { token },
      include: [
        { model: Organization, as: 'organization' }
      ]
    });

    if (!invite) {
      res.status(404).json({ error: 'Invite not found' });
      return;
    }

    if (invite.accepted) {
      res.status(400).json({ error: 'Invite has already been accepted' });
      return;
    }

    if (invite.isExpired()) {
      res.status(400).json({ error: 'Invite has expired' });
      return;
    }

    // Check if email is already registered
    const existingUser = await User.findOne({ where: { email: invite.email } });
    if (existingUser) {
      // If user exists but not in an org, add them to this org
      if (!existingUser.org_id) {
        existingUser.org_id = invite.org_id;
        existingUser.invited_by = invite.invited_by;
        existingUser.role = 'member';
        await existingUser.save();

        invite.accepted = true;
        await invite.save();

        const jwtToken = generateToken({
          id: existingUser.id,
          username: existingUser.username,
          email: existingUser.email,
          org_id: existingUser.org_id,
          role: existingUser.role
        });

        res.json({
          message: 'Joined organization successfully',
          user: existingUser.toJSON(),
          token: jwtToken
        });
        return;
      }

      res.status(400).json({ error: 'Email is already registered with another organization' });
      return;
    }

    // Check username availability
    const existingUsername = await User.findOne({ where: { username } });
    if (existingUsername) {
      res.status(400).json({ error: 'Username is already taken' });
      return;
    }

    // Create new user
    const user = await User.create({
      username,
      email: invite.email,
      password,
      org_id: invite.org_id,
      role: 'member',
      invited_by: invite.invited_by
    });

    // Mark invite as accepted
    invite.accepted = true;
    await invite.save();

    const jwtToken = generateToken({
      id: user.id,
      username: user.username,
      email: user.email,
      org_id: user.org_id,
      role: user.role
    });

    res.status(201).json({
      message: 'Account created successfully',
      user: user.toJSON(),
      token: jwtToken
    });
  } catch (error) {
    console.error('Accept invite error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const resendInvite = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const orgId = req.user!.org_id;

    if (!orgId) {
      res.status(400).json({ error: 'No organization found' });
      return;
    }

    if (req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Only admins can resend invites' });
      return;
    }

    const invite = await Invite.findOne({
      where: { id, org_id: orgId }
    });

    if (!invite) {
      res.status(404).json({ error: 'Invite not found' });
      return;
    }

    if (invite.accepted) {
      res.status(400).json({ error: 'Invite has already been accepted' });
      return;
    }

    // Update expiry date (extend by 7 days from now)
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);
    invite.expires_at = newExpiresAt;
    await invite.save();

    // Resend email
    const organization = await Organization.findByPk(orgId);
    const inviter = await User.findByPk(req.user!.id);

    try {
      await sendInviteEmail(
        invite.email,
        invite.token,
        organization?.name || 'Organization',
        inviter?.username || 'Admin'
      );
    } catch (emailError) {
      console.error('Failed to resend invite email:', emailError);
    }

    res.json({ message: 'Invite resent successfully' });
  } catch (error) {
    console.error('Resend invite error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const cancelInvite = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const orgId = req.user!.org_id;

    if (!orgId) {
      res.status(400).json({ error: 'No organization found' });
      return;
    }

    if (req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Only admins can cancel invites' });
      return;
    }

    const invite = await Invite.findOne({
      where: { id, org_id: orgId }
    });

    if (!invite) {
      res.status(404).json({ error: 'Invite not found' });
      return;
    }

    await invite.destroy();

    res.json({ message: 'Invite cancelled successfully' });
  } catch (error) {
    console.error('Cancel invite error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
