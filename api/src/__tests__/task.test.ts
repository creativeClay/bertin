import request from 'supertest';
import { createTestApp } from './helpers/testApp';
import { createTestAdmin, createTestUser, createTestTask, getAuthToken } from './helpers/testData';

const app = createTestApp();

describe('Task Controller', () => {
  describe('POST /api/tasks', () => {
    it('should create a new task', async () => {
      const { admin, org } = await createTestAdmin();
      const token = getAuthToken(admin);

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'New Task',
          description: 'Task description',
          status: 'Pending'
        });

      expect(response.status).toBe(201);
      expect(response.body.task).toBeDefined();
      expect(response.body.task.title).toBe('New Task');
      expect(response.body.task.org_id).toBe(org.id);
      expect(response.body.task.created_by).toBe(admin.id);
    });

    it('should fail without title', async () => {
      const { admin } = await createTestAdmin();
      const token = getAuthToken(admin);

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({
          description: 'Task description'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Title is required');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({
          title: 'New Task'
        });

      expect(response.status).toBe(401);
    });

    it('should fail if user has no organization', async () => {
      const user = await createTestUser();
      const token = getAuthToken(user);

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'New Task'
        });

      expect(response.status).toBe(403);
    });

    it('should fail if assigned_to is not in same organization', async () => {
      const { admin, org } = await createTestAdmin();
      const otherUser = await createTestUser();
      const token = getAuthToken(admin);

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'New Task',
          assigned_to: otherUser.id
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('member of your organization');
    });
  });

  describe('GET /api/tasks', () => {
    it('should return all tasks for organization', async () => {
      const { admin, org } = await createTestAdmin();
      await createTestTask(org.id, admin.id, { title: 'Task 1' });
      await createTestTask(org.id, admin.id, { title: 'Task 2' });
      const token = getAuthToken(admin);

      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.tasks).toHaveLength(2);
    });

    it('should filter tasks by status', async () => {
      const { admin, org } = await createTestAdmin();
      await createTestTask(org.id, admin.id, { title: 'Task 1', status: 'Pending' });
      await createTestTask(org.id, admin.id, { title: 'Task 2', status: 'Completed' });
      const token = getAuthToken(admin);

      const response = await request(app)
        .get('/api/tasks?status=Pending')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.tasks).toHaveLength(1);
      expect(response.body.tasks[0].status).toBe('Pending');
    });

    it('should filter tasks by assigned user', async () => {
      const { admin, org } = await createTestAdmin();
      const member = await createTestUser({ org_id: org.id });
      await createTestTask(org.id, admin.id, { title: 'Task 1', assigned_to: member.id });
      await createTestTask(org.id, admin.id, { title: 'Task 2' });
      const token = getAuthToken(admin);

      const response = await request(app)
        .get(`/api/tasks?assigned_to=${member.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.tasks).toHaveLength(1);
      expect(response.body.tasks[0].assigned_to).toBe(member.id);
    });

    it('should not return tasks from other organizations', async () => {
      const { admin: admin1, org: org1 } = await createTestAdmin();
      const { admin: admin2, org: org2 } = await createTestAdmin();
      await createTestTask(org1.id, admin1.id, { title: 'Org1 Task' });
      await createTestTask(org2.id, admin2.id, { title: 'Org2 Task' });
      const token = getAuthToken(admin1);

      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.tasks).toHaveLength(1);
      expect(response.body.tasks[0].title).toBe('Org1 Task');
    });
  });

  describe('GET /api/tasks/:id', () => {
    it('should return task by id', async () => {
      const { admin, org } = await createTestAdmin();
      const task = await createTestTask(org.id, admin.id, { title: 'Test Task' });
      const token = getAuthToken(admin);

      const response = await request(app)
        .get(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.task.id).toBe(task.id);
      expect(response.body.task.title).toBe('Test Task');
    });

    it('should return 404 for non-existent task', async () => {
      const { admin } = await createTestAdmin();
      const token = getAuthToken(admin);

      const response = await request(app)
        .get('/api/tasks/99999')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });

    it('should not return task from another organization', async () => {
      const { admin: admin1, org: org1 } = await createTestAdmin();
      const { admin: admin2, org: org2 } = await createTestAdmin();
      const task = await createTestTask(org2.id, admin2.id);
      const token = getAuthToken(admin1);

      const response = await request(app)
        .get(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/tasks/:id', () => {
    it('should update task', async () => {
      const { admin, org } = await createTestAdmin();
      const task = await createTestTask(org.id, admin.id, { title: 'Original Title' });
      const token = getAuthToken(admin);

      const response = await request(app)
        .put(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Updated Title',
          status: 'In Progress'
        });

      expect(response.status).toBe(200);
      expect(response.body.task.title).toBe('Updated Title');
      expect(response.body.task.status).toBe('In Progress');
    });

    it('should return 404 for non-existent task', async () => {
      const { admin } = await createTestAdmin();
      const token = getAuthToken(admin);

      const response = await request(app)
        .put('/api/tasks/99999')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('should delete task', async () => {
      const { admin, org } = await createTestAdmin();
      const task = await createTestTask(org.id, admin.id);
      const token = getAuthToken(admin);

      const response = await request(app)
        .delete(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Task deleted successfully');
    });

    it('should return 404 for non-existent task', async () => {
      const { admin } = await createTestAdmin();
      const token = getAuthToken(admin);

      const response = await request(app)
        .delete('/api/tasks/99999')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/tasks/stats', () => {
    it('should return task statistics', async () => {
      const { admin, org } = await createTestAdmin();
      await createTestTask(org.id, admin.id, { status: 'Pending' });
      await createTestTask(org.id, admin.id, { status: 'In Progress' });
      await createTestTask(org.id, admin.id, { status: 'Completed' });
      await createTestTask(org.id, admin.id, { status: 'Completed' });
      const token = getAuthToken(admin);

      const response = await request(app)
        .get('/api/tasks/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.stats.total).toBe(4);
      expect(response.body.stats.pending).toBe(1);
      expect(response.body.stats.inProgress).toBe(1);
      expect(response.body.stats.completed).toBe(2);
    });
  });

  describe('GET /api/tasks/users', () => {
    it('should return users in organization', async () => {
      const { admin, org } = await createTestAdmin();
      await createTestUser({ org_id: org.id, first_name: 'Member', last_name: 'One' });
      await createTestUser({ org_id: org.id, first_name: 'Member', last_name: 'Two' });
      const token = getAuthToken(admin);

      const response = await request(app)
        .get('/api/tasks/users')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.users).toHaveLength(3); // admin + 2 members
    });
  });
});
