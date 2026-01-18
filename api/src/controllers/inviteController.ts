import { Request, Response } from 'express';
import { Invite, Organization, User } from '../models';
import { AuthRequest } from '../types';
import { generateToken } from '../middleware/auth';
import { sendInviteEmail } from '../services/emailService';
import * as XLSX from 'xlsx';

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
        { model: User, as: 'inviter', attributes: ['id', 'first_name', 'last_name', 'email'] }
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
        inviter?.full_name || 'Admin'
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

export const bulkCreateInvites = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
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

    // Check if file was uploaded
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded. Please upload a CSV or Excel file.' });
      return;
    }

    // Parse the file
    let emails: string[] = [];
    const fileBuffer = req.file.buffer;
    const fileName = req.file.originalname.toLowerCase();

    if (fileName.endsWith('.csv')) {
      // Parse CSV
      const content = fileBuffer.toString('utf-8');
      const lines = content.split(/\r?\n/).filter(line => line.trim());
      emails = lines.map(line => {
        // Handle CSV with columns - take first column or find email column
        const cells = line.split(',').map(cell => cell.trim().replace(/^["']|["']$/g, ''));
        // Look for email in each cell
        const emailCell = cells.find(cell => cell.includes('@'));
        return emailCell || cells[0];
      }).filter(email => email && email.includes('@'));
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      // Parse Excel
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

      const flatData = (data as any[][]).flat();
      emails = flatData.filter((cell): cell is string =>
        typeof cell === 'string' && cell.includes('@')
      );
    } else {
      res.status(400).json({ error: 'Invalid file format. Please upload a CSV or Excel file.' });
      return;
    }

    if (emails.length === 0) {
      res.status(400).json({ error: 'No valid email addresses found in the file' });
      return;
    }

    // Validate and deduplicate emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validEmails = [...new Set(emails.filter(email => emailRegex.test(email)))];

    if (validEmails.length === 0) {
      res.status(400).json({ error: 'No valid email addresses found in the file' });
      return;
    }

    const organization = await Organization.findByPk(orgId);
    const inviter = await User.findByPk(invitedBy);

    const results = {
      success: [] as string[],
      failed: [] as { email: string; reason: string }[]
    };

    for (const email of validEmails) {
      try {
        // Check if user already exists in org
        const existingUser = await User.findOne({
          where: { email, org_id: orgId }
        });

        if (existingUser) {
          results.failed.push({ email, reason: 'Already a member' });
          continue;
        }

        // Check for existing pending invite
        const existingInvite = await Invite.findOne({
          where: { email, org_id: orgId, accepted: false }
        });

        if (existingInvite && !existingInvite.isExpired()) {
          results.failed.push({ email, reason: 'Pending invite exists' });
          continue;
        }

        // Delete expired invite if exists
        if (existingInvite) {
          await existingInvite.destroy();
        }

        // Create invite
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const invite = await Invite.create({
          email,
          org_id: orgId,
          invited_by: invitedBy,
          expires_at: expiresAt
        });

        // Send invite email (don't wait, fire and forget)
        sendInviteEmail(
          email,
          invite.token,
          organization?.name || 'Organization',
          inviter?.full_name || 'Admin'
        ).catch(err => console.error(`Failed to send invite email to ${email}:`, err));

        results.success.push(email);
      } catch (error) {
        results.failed.push({ email, reason: 'Internal error' });
      }
    }

    res.status(201).json({
      message: `Bulk invite completed: ${results.success.length} sent, ${results.failed.length} failed`,
      results
    });
  } catch (error) {
    console.error('Bulk create invites error:', error);
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
        { model: User, as: 'inviter', attributes: ['id', 'first_name', 'last_name'] }
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
        { model: User, as: 'inviter', attributes: ['id', 'first_name', 'last_name'] }
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
    const { first_name, last_name, middle_name, password } = req.body;

    if (!first_name || !last_name || !password) {
      res.status(400).json({ error: 'First name, last name, and password are required' });
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

    // Create new user
    const user = await User.create({
      first_name,
      last_name,
      middle_name: middle_name || null,
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
        inviter?.full_name || 'Admin'
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
