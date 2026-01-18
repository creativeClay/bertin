import request from 'supertest';
import { createTestApp } from './helpers/testApp';
import { createTestAdmin, createTestUser, getAuthToken } from './helpers/testData';

const app = createTestApp();

describe('Organization Controller', () => {
  describe('GET /api/organization', () => {
    it('should return organization details', async () => {
      const { admin, org } = await createTestAdmin();
      const token = getAuthToken(admin);

      const response = await request(app)
        .get('/api/organization')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.organization).toBeDefined();
      expect(response.body.organization.id).toBe(org.id);
      expect(response.body.organization.name).toBe(org.name);
    });

    it('should fail if user has no organization', async () => {
      const user = await createTestUser();
      const token = getAuthToken(user);

      const response = await request(app)
        .get('/api/organization')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/organization');

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/organization', () => {
    it('should update organization name (admin only)', async () => {
      const { admin, org } = await createTestAdmin();
      const token = getAuthToken(admin);

      const response = await request(app)
        .put('/api/organization')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Organization Name' });

      expect(response.status).toBe(200);
      expect(response.body.organization.name).toBe('Updated Organization Name');
    });

    it('should fail if user is not admin', async () => {
      const { admin, org } = await createTestAdmin();
      const member = await createTestUser({ org_id: org.id, role: 'member' });
      const token = getAuthToken(member);

      const response = await request(app)
        .put('/api/organization')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Name' });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/organization/members', () => {
    it('should return all organization members', async () => {
      const { admin, org } = await createTestAdmin();
      await createTestUser({ org_id: org.id, username: 'member1' });
      await createTestUser({ org_id: org.id, username: 'member2' });
      const token = getAuthToken(admin);

      const response = await request(app)
        .get('/api/organization/members')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.members).toHaveLength(3);
    });

    it('should fail if user has no organization', async () => {
      const user = await createTestUser();
      const token = getAuthToken(user);

      const response = await request(app)
        .get('/api/organization/members')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/organization/members/:memberId', () => {
    it('should remove member from organization (admin only)', async () => {
      const { admin, org } = await createTestAdmin();
      const member = await createTestUser({ org_id: org.id });
      const token = getAuthToken(admin);

      const response = await request(app)
        .delete(`/api/organization/members/${member.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Member removed successfully');
    });

    it('should fail if user is not admin', async () => {
      const { admin, org } = await createTestAdmin();
      const member1 = await createTestUser({ org_id: org.id, role: 'member' });
      const member2 = await createTestUser({ org_id: org.id, role: 'member' });
      const token = getAuthToken(member1);

      const response = await request(app)
        .delete(`/api/organization/members/${member2.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
    });

    it('should not allow removing admin', async () => {
      const { admin, org } = await createTestAdmin();
      const token = getAuthToken(admin);

      const response = await request(app)
        .delete(`/api/organization/members/${admin.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Cannot remove admin');
    });

    it('should return 404 for non-existent member', async () => {
      const { admin } = await createTestAdmin();
      const token = getAuthToken(admin);

      const response = await request(app)
        .delete('/api/organization/members/99999')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/organization/members/:memberId/role', () => {
    it('should update member role to admin', async () => {
      const { admin, org } = await createTestAdmin();
      const member = await createTestUser({ org_id: org.id, role: 'member' });
      const token = getAuthToken(admin);

      const response = await request(app)
        .put(`/api/organization/members/${member.id}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'admin' });

      expect(response.status).toBe(200);
      expect(response.body.member.role).toBe('admin');
    });

    it('should update member role to member', async () => {
      const { admin, org } = await createTestAdmin();
      const member = await createTestUser({ org_id: org.id, role: 'admin' });
      const token = getAuthToken(admin);

      const response = await request(app)
        .put(`/api/organization/members/${member.id}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'member' });

      expect(response.status).toBe(200);
      expect(response.body.member.role).toBe('member');
    });

    it('should fail with invalid role', async () => {
      const { admin, org } = await createTestAdmin();
      const member = await createTestUser({ org_id: org.id });
      const token = getAuthToken(admin);

      const response = await request(app)
        .put(`/api/organization/members/${member.id}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'invalid' });

      expect(response.status).toBe(400);
    });

    it('should fail if user is not admin', async () => {
      const { admin, org } = await createTestAdmin();
      const member1 = await createTestUser({ org_id: org.id, role: 'member' });
      const member2 = await createTestUser({ org_id: org.id, role: 'member' });
      const token = getAuthToken(member1);

      const response = await request(app)
        .put(`/api/organization/members/${member2.id}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'admin' });

      expect(response.status).toBe(403);
    });
  });
});
