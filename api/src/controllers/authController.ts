import { Request, Response } from 'express';
import { User, Organization } from '../models';
import { generateToken } from '../middleware/auth';
import { AuthRequest } from '../types';

const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    + '-' + Date.now().toString(36);
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password, organizationName } = req.body;

    if (!username || !email || !password || !organizationName) {
      res.status(400).json({ error: 'Username, email, password, and organization name are required' });
      return;
    }

    const existingUser = await User.findOne({
      where: { email }
    });

    if (existingUser) {
      res.status(400).json({ error: 'Email already registered' });
      return;
    }

    const existingUsername = await User.findOne({
      where: { username }
    });

    if (existingUsername) {
      res.status(400).json({ error: 'Username already taken' });
      return;
    }

    // Create user first (without org)
    const user = await User.create({
      username,
      email,
      password,
      role: 'admin'
    });

    // Create organization
    const organization = await Organization.create({
      name: organizationName,
      slug: generateSlug(organizationName),
      created_by: user.id
    });

    // Update user with org_id
    user.org_id = organization.id;
    await user.save();

    const token = generateToken({
      id: user.id,
      username: user.username,
      email: user.email,
      org_id: user.org_id,
      role: user.role
    });

    res.status(201).json({
      message: 'Organization created successfully',
      user: user.toJSON(),
      organization,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await User.findOne({
      where: { email },
      include: [
        { model: Organization, as: 'organization', attributes: ['id', 'name', 'slug'] }
      ]
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const isValidPassword = await user.validatePassword(password);

    if (!isValidPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = generateToken({
      id: user.id,
      username: user.username,
      email: user.email,
      org_id: user.org_id,
      role: user.role
    });

    res.json({
      message: 'Login successful',
      user: user.toJSON(),
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const user = await User.findByPk(userId, {
      include: [
        { model: Organization, as: 'organization', attributes: ['id', 'name', 'slug'] }
      ]
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user: user.toJSON() });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
