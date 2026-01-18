import request from 'supertest';
import { createTestApp } from './helpers/testApp';
import { createTestAdmin, createTestUser, createTestInvite, getAuthToken } from './helpers/testData';
import { Invite } from '../models';

const app = createTestApp();

describe('Invite Controller', () => {
  describe('POST /api/organization/invites', () => {
    it('should create a new invite (admin only)', async () => {
      const { admin, org } = await createTestAdmin();
      const token = getAuthToken(admin);

      const response = await request(app)
        .post('/api/organization/invites')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'newinvite@example.com' });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Invite sent successfully');
      expect(response.body.invite).toBeDefined();
      expect(response.body.invite.email).toBe('newinvite@example.com');
    });

    it('should fail if user is not admin', async () => {
      const { admin, org } = await createTestAdmin();
      const member = await createTestUser({ org_id: org.id, role: 'member' });
      const token = getAuthToken(member);

      const response = await request(app)
        .post('/api/organization/invites')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'newinvite@example.com' });

      expect(response.status).toBe(403);
    });

    it('should fail if email missing', async () => {
      const { admin } = await createTestAdmin();
      const token = getAuthToken(admin);

      const response = await request(app)
        .post('/api/organization/invites')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email is required');
    });

    it('should fail if user is already a member', async () => {
      const { admin, org } = await createTestAdmin();
      const member = await createTestUser({ org_id: org.id });
      const token = getAuthToken(admin);

      const response = await request(app)
        .post('/api/organization/invites')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: member.email });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('User is already a member of this organization');
    });

    it('should fail if invite already exists', async () => {
      const { admin, org } = await createTestAdmin();
      await createTestInvite(org.id, admin.id, 'existing@example.com');
      const token = getAuthToken(admin);

      const response = await request(app)
        .post('/api/organization/invites')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'existing@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('An invite has already been sent to this email');
    });
  });

  describe('GET /api/organization/invites', () => {
    it('should return all invites (admin only)', async () => {
      const { admin, org } = await createTestAdmin();
      await createTestInvite(org.id, admin.id, 'invite1@example.com');
      await createTestInvite(org.id, admin.id, 'invite2@example.com');
      const token = getAuthToken(admin);

      const response = await request(app)
        .get('/api/organization/invites')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.invites).toHaveLength(2);
    });

    it('should fail if user is not admin', async () => {
      const { admin, org } = await createTestAdmin();
      const member = await createTestUser({ org_id: org.id, role: 'member' });
      const token = getAuthToken(member);

      const response = await request(app)
        .get('/api/organization/invites')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/organization/invites/:id/resend', () => {
    it('should resend invite (admin only)', async () => {
      const { admin, org } = await createTestAdmin();
      const invite = await createTestInvite(org.id, admin.id);
      const originalExpiry = invite.expires_at;
      const token = getAuthToken(admin);

      const response = await request(app)
        .post(`/api/organization/invites/${invite.id}/resend`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Invite resent successfully');

      // Check that expiry was extended
      const updatedInvite = await Invite.findByPk(invite.id);
      expect(updatedInvite!.expires_at.getTime()).toBeGreaterThan(originalExpiry.getTime());
    });

    it('should fail if user is not admin', async () => {
      const { admin, org } = await createTestAdmin();
      const invite = await createTestInvite(org.id, admin.id);
      const member = await createTestUser({ org_id: org.id, role: 'member' });
      const token = getAuthToken(member);

      const response = await request(app)
        .post(`/api/organization/invites/${invite.id}/resend`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
    });

    it('should return 404 for non-existent invite', async () => {
      const { admin } = await createTestAdmin();
      const token = getAuthToken(admin);

      const response = await request(app)
        .post('/api/organization/invites/99999/resend')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });

    it('should fail for already accepted invite', async () => {
      const { admin, org } = await createTestAdmin();
      const invite = await createTestInvite(org.id, admin.id);
      invite.accepted = true;
      await invite.save();
      const token = getAuthToken(admin);

      const response = await request(app)
        .post(`/api/organization/invites/${invite.id}/resend`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invite has already been accepted');
    });
  });

  describe('DELETE /api/organization/invites/:id', () => {
    it('should cancel invite (admin only)', async () => {
      const { admin, org } = await createTestAdmin();
      const invite = await createTestInvite(org.id, admin.id);
      const token = getAuthToken(admin);

      const response = await request(app)
        .delete(`/api/organization/invites/${invite.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Invite cancelled successfully');
    });

    it('should return 404 for non-existent invite', async () => {
      const { admin } = await createTestAdmin();
      const token = getAuthToken(admin);

      const response = await request(app)
        .delete('/api/organization/invites/99999')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/invites/:token', () => {
    it('should return invite details by token', async () => {
      const { admin, org } = await createTestAdmin();
      const invite = await createTestInvite(org.id, admin.id);

      const response = await request(app)
        .get(`/api/invites/${invite.token}`);

      expect(response.status).toBe(200);
      expect(response.body.invite).toBeDefined();
      expect(response.body.invite.email).toBe(invite.email);
    });

    it('should return 404 for invalid token', async () => {
      const response = await request(app)
        .get('/api/invites/invalidtoken');

      expect(response.status).toBe(404);
    });

    it('should return error for already accepted invite', async () => {
      const { admin, org } = await createTestAdmin();
      const invite = await createTestInvite(org.id, admin.id);
      invite.accepted = true;
      await invite.save();

      const response = await request(app)
        .get(`/api/invites/${invite.token}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invite has already been accepted');
    });

    it('should return error for expired invite', async () => {
      const { admin, org } = await createTestAdmin();
      const invite = await createTestInvite(org.id, admin.id);
      invite.expires_at = new Date(Date.now() - 1000); // expired
      await invite.save();

      const response = await request(app)
        .get(`/api/invites/${invite.token}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invite has expired');
    });
  });

  describe('POST /api/invites/:token/accept', () => {
    it('should accept invite and create new user', async () => {
      const { admin, org } = await createTestAdmin();
      const invite = await createTestInvite(org.id, admin.id);

      const response = await request(app)
        .post(`/api/invites/${invite.token}/accept`)
        .send({
          username: 'newmember',
          password: 'password123'
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Account created successfully');
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe('newmember');
      expect(response.body.user.org_id).toBe(org.id);
      expect(response.body.user.role).toBe('member');
      expect(response.body.token).toBeDefined();
    });

    it('should fail without username or password', async () => {
      const { admin, org } = await createTestAdmin();
      const invite = await createTestInvite(org.id, admin.id);

      const response = await request(app)
        .post(`/api/invites/${invite.token}/accept`)
        .send({
          username: 'newmember'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Username and password are required');
    });

    it('should fail if username already exists', async () => {
      const { admin, org } = await createTestAdmin();
      await createTestUser({ username: 'existinguser' });
      const invite = await createTestInvite(org.id, admin.id);

      const response = await request(app)
        .post(`/api/invites/${invite.token}/accept`)
        .send({
          username: 'existinguser',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Username is already taken');
    });

    it('should return 404 for invalid token', async () => {
      const response = await request(app)
        .post('/api/invites/invalidtoken/accept')
        .send({
          username: 'newmember',
          password: 'password123'
        });

      expect(response.status).toBe(404);
    });

    it('should fail for already accepted invite', async () => {
      const { admin, org } = await createTestAdmin();
      const invite = await createTestInvite(org.id, admin.id);
      invite.accepted = true;
      await invite.save();

      const response = await request(app)
        .post(`/api/invites/${invite.token}/accept`)
        .send({
          username: 'newmember',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invite has already been accepted');
    });
  });
});
