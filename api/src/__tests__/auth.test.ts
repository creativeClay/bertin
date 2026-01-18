import request from 'supertest';
import { createTestApp } from './helpers/testApp';
import { createTestUser, createTestAdmin, getAuthToken } from './helpers/testData';
import { User, Organization } from '../models';

const app = createTestApp();

describe('Auth Controller', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new organization and admin user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newadmin',
          email: 'newadmin@example.com',
          password: 'password123',
          organizationName: 'New Organization'
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Organization created successfully');
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe('newadmin');
      expect(response.body.user.role).toBe('admin');
      expect(response.body.organization).toBeDefined();
      expect(response.body.organization.name).toBe('New Organization');
      expect(response.body.token).toBeDefined();
    });

    it('should fail if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newadmin',
          email: 'newadmin@example.com'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('should fail if email already exists', async () => {
      await createTestUser({ email: 'existing@example.com' });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          email: 'existing@example.com',
          password: 'password123',
          organizationName: 'Test Org'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email already registered');
    });

    it('should fail if username already exists', async () => {
      await createTestUser({ username: 'existinguser' });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'existinguser',
          email: 'new@example.com',
          password: 'password123',
          organizationName: 'Test Org'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Username already taken');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const { admin } = await createTestAdmin();

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: admin.email,
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(admin.email);
      expect(response.body.token).toBeDefined();
    });

    it('should fail with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should fail with invalid password', async () => {
      const { admin } = await createTestAdmin();

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: admin.email,
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should fail if email or password missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email and password are required');
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should return user profile when authenticated', async () => {
      const { admin } = await createTestAdmin();
      const token = getAuthToken(admin);

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.id).toBe(admin.id);
      expect(response.body.user.email).toBe(admin.email);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/auth/profile');

      expect(response.status).toBe(401);
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalidtoken');

      expect(response.status).toBe(401);
    });
  });
});
